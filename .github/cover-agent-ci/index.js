const core = require('@actions/core');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to execute shell commands
function execPromise(command) {
    return new Promise((resolve, reject) => {
        const cmd = exec(command);

        let stdout = '';
        let stderr = '';

        cmd.stdout.on('data', (data) => {
            stdout += data;
            process.stdout.write(data);
        });

        cmd.stderr.on('data', (data) => {
            stderr += data;
            process.stderr.write(data);
        });

        cmd.on('error', (error) => {
            reject(error);
        });

        cmd.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command exited with code ${code}: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

// Main function
async function run() {
    try {
        if (!process.env.GITHUB_REF.startsWith('refs/pull/')) {
            core.setFailed('This action can only be run in the context of a pull request.');
            return;
        }

        const testCommand = core.getInput('test-command');
        const coverageType = core.getInput('coverage-type');
        const desiredCoverage = core.getInput('desired-coverage');
        const maxIterations = core.getInput('max-iterations');
        const refParts = process.env.GITHUB_REF.split('/');
        const prNumber = refParts[2]; // PR number is the second part of the path

        // Fetch PR details using GitHub CLI
        let previousBranchName = '';
        console.log(`Fetching PR details with PR number: ${prNumber}`);
        try {
            const { stdout } = await execPromise(`gh pr view ${prNumber} --json headRefName --jq '.headRefName'`);
            previousBranchName = stdout.trim();
        } catch (error) {
            console.error('Error fetching PR details:', error.message);
            core.setFailed(`Failed to fetch PR details: ${error.message}`);
            return;
        }

        const newBranchName = `${previousBranchName}-test`;
        const newPRTitle = `Test Coverage for ${previousBranchName}`;
        const newPRBody = `This PR is created for testing purposes based on the previous branch: ${previousBranchName}.`;

        // Fetch changed files in the PR
        console.log('Fetching changed files in the PR');
        const { stdout: changedFilesStdout } = await execPromise(`gh pr diff ${prNumber} --name-only`);
        const filePaths = changedFilesStdout.split('\n').filter(Boolean);
        const testDirs = new Set();

        console.log(`Changed files in PR #${prNumber}:`);
        filePaths.forEach(filePath => {
            console.log(`Processing file: ${filePath}`);
            const testDir = findTestDirectory(filePath);
            if (testDir) {
                testDirs.add(testDir);
            }
        });

        // Step 3: Run coverage check for each test directory
        for (const testDir of testDirs) {
            console.log(`Running coverage check in directory: ${testDir}`);
            await runCoverageCheck(testDir, testCommand, coverageType, desiredCoverage, maxIterations);
        }

        // Step 4: Save updated coverage report
        await saveCoverageReport('./updated-coverage.xml');

        // Step 5: Upload updated coverage reports
        await uploadCoverageReports();

        // Step 6: Compare coverage reports
        const coverageSummary = await compareCoverageReports();

        // Step 7: Comment on the PR
        await commentOnPR(prNumber, coverageSummary);

        // Step 8: Create a PR with changes
        await createPRWithChanges(newBranchName, newPRTitle, newPRBody);

    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

async function uploadTestResults() {
    try {
        console.log('Uploading test results as artifacts');
        await execPromise('gh actions upload-artifact ./test-results --name test-results');
    } catch (error) {
        core.setFailed(`Failed to upload test results: ${error.message}`);
    }
}

async function listCoverageDirectory() {
    try {
        console.log('Listing contents of the coverage directory');
        await execPromise('ls -la ./coverage');
    } catch (error) {
        core.setFailed(`Failed to list coverage directory: ${error.message}`);
    }
}

async function saveCoverageReport(reportPath) {
    try {
        // Debugging: List coverage directory
        console.log('Listing contents of the coverage directory');
        console.log(`Saving coverage report to ${reportPath}`);
    } catch (error) {
        core.setFailed(`Failed to save coverage report: ${error.message}`);
    }
}

async function uploadCoverageReports() {
    try {
        console.log('Uploading coverage reports as artifacts');
        await execPromise('gh actions upload-artifact ./initial-coverage.xml --name initial-coverage');
        await execPromise('gh actions upload-artifact ./updated-coverage.xml --name updated-coverage');
    } catch (error) {
        core.setFailed(`Failed to upload coverage reports: ${error.message}`);
    }
}

async function compareCoverageReports() {
    try {
        console.log('Comparing coverage reports');
        // Implement the logic to compare coverage reports
        return 'Coverage comparison summary...'; // Replace with actual summary
    } catch (error) {
        core.setFailed(`Failed to compare coverage reports: ${error.message}`);
        return 'Error comparing coverage reports';
    }
}

async function commentOnPR(prNumber, coverageSummary) {
    try {
        console.log('Commenting on PR with coverage summary');
        await execPromise(`gh pr comment ${prNumber} --body "### Coverage Summary\n\n${coverageSummary}"`);
    } catch (error) {
        core.setFailed(`Failed to comment on PR: ${error.message}`);
    }
}

async function createPRWithChanges(branchName, title, body) {
    try {
        console.log(`Creating PR from branch: ${branchName}`);
        await execPromise(`gh pr create --head ${branchName} --base main --title "${title}" --body "${body}"`);
    } catch (error) {
        core.setFailed(`Failed to create PR: ${error.message}`);
    }
}

function findTestDirectory(filePath) {
    const possibleTestDirs = ['__tests__', 'tests']; // Adjust based on your project structure
    const fileDir = path.dirname(filePath);

    for (const testDir of possibleTestDirs) {
        const testDirPath = path.join(fileDir, testDir);
        if (fs.existsSync(testDirPath) && fs.readdirSync(testDirPath).length > 0) {
            return testDirPath;
        }
    }

    return null;
}

function runCoverageCheck(testDir, testCommand, coverageType, desiredCoverage, maxIterations) {
    return new Promise((resolve, reject) => {
        const command = `npx cover-agent \
      --code-coverage-report-path "./coverage/cobertura-coverage.xml" \
      --test-command "${testCommand}" \
      --test-command-dir "${testDir}" \
      --coverage-type "${coverageType}" \
      --desired-coverage ${desiredCoverage} \
      --max-iterations ${maxIterations}`;

        console.log(`Executing command: ${command}`);

        execPromise(command)
            .then((code) => {
                console.log(`cover-agent exited with code ${code}`);
                resolve(code);
            })
            .catch((error) => {
                console.error(`Error: ${error.message}`);
                reject(error);
            });
    });
}

// Run the main function
run();
