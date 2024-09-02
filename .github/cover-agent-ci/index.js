const core = require('@actions/core');
const { exec } = require('child_process');
const { Octokit } = require('@octokit/rest');
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

        cmd.on('error', (error) => reject(error));
        cmd.on('close', (code) => {
            code === 0 ? resolve(code) : reject(new Error(`Command exited with code ${code}: ${stderr}`));
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

        const testCommand = core.getInput('testCommand');
        const coverageType = core.getInput('coverageType');
        const desiredCoverage = core.getInput('desiredCoverage');
        const maxIterations = core.getInput('maxIterations');

        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const prNumber = process.env.GITHUB_REF.split('/')[2];
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const openApiKey = process.env.OPENAI_API_KEY;
        if (!openApiKey) {
            core.setFailed('OPEN_API_KEY environment variable is not set.');
            return;
        }

        let previousPR;
        try {
            const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
            previousPR = data;
        } catch (error) {
            core.setFailed(`Failed to fetch PR details: ${error.message}`);
            return;
        }

        const previousBranchName = previousPR.head.ref;
        const newBranchName = `${previousBranchName}-test`;
        const newPRTitle = `Test Coverage for ${previousBranchName}`;
        const newPRBody = `This PR is created for testing purposes based on the previous branch: ${previousBranchName}.`;

        let changedFiles;
        try {
            const { data } = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber });
            changedFiles = data;
        } catch (error) {
            core.setFailed(`Failed to fetch changed files: ${error.message}`);
            return;
        }

        const filePaths = changedFiles.map(file => file.filename);
        const testDirs = new Set();

        filePaths.forEach(filePath => {
            if (!filePath.endsWith('.test')) {
                const testDir = findTestDirectory(filePath);
                if (testDir) {
                    testDirs.add({ path: filePath, test: testDir });
                }
            }
        });

        for (const testDir of testDirs) {
            await runCoverageCheck(testDir, testCommand, coverageType, desiredCoverage, maxIterations);
        }

        await saveCoverageReport('./updated-coverage.xml');
        await uploadCoverageReports();
        const coverageSummary = await compareCoverageReports();

        // Uncomment and implement the following lines as needed
        // await commentOnPR(prNumber, coverageSummary);
        // await createPRWithChanges(newBranchName, newPRTitle, newPRBody);

    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

// Function implementations

async function uploadTestResults() {
    try {
        console.log('Uploading test results as artifacts');
        await execPromise('gh actions upload-artifact ./test-results --name test-results');
    } catch (error) {
        core.setFailed(`Failed to upload test results: ${error.message}`);
    }
}

async function saveCoverageReport(reportPath) {
    try {
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
        return 'Coverage comparison summary...'; // Implement actual comparison logic
    } catch (error) {
        core.setFailed(`Failed to compare coverage reports: ${error.message}`);
        return 'Error comparing coverage reports';
    }
}

async function commentOnPR(prNumber, coverageSummary) {
    try {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        console.log('Commenting on PR with coverage summary');
        await octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: `### Coverage Summary\n\n${coverageSummary}`,
        });
    } catch (error) {
        core.setFailed(`Failed to comment on PR: ${error.message}`);
    }
}

async function createPRWithChanges(branchName, title, body) {
    try {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const octokit = new Octokit({ auth: process.env.GITHUB_PR_TOKEN });

        console.log(`Creating PR from branch: ${branchName}`);

        await octokit.pulls.create({
            owner,
            repo,
            title,
            body,
            head: branchName,
            base: 'master', // Change if necessary
        });
    } catch (error) {
        core.setFailed(`Failed to create PR: ${error.message}`);
    }
}

function findTestDirectory(filePath) {
    const possibleTestDirs = ['__tests__', 'tests']; // Adjust based on your project structure
    const fileDir = path.dirname(filePath);

    for (const testDir of possibleTestDirs) {
        const testDirPath = path.join(fileDir, '..', testDir);
        if (fs.existsSync(testDirPath) && fs.readdirSync(testDirPath).length > 0) {
            return testDirPath;
        }
    }

    return null;
}

function runCoverageCheck(testDir, testCommand, coverageType, desiredCoverage, maxIterations) {
    return new Promise((resolve, reject) => {
        const command = `cover-agent \
      --source-file-path "${testDir.path}" \
      --test-file-path "${testDir.test}/${testDir.path.split("/").pop().replace(/\\.ts$/, '.test.ts')}" \
      --code-coverage-report-path "./coverage/cobertura-coverage.xml" \
      --test-command "${testCommand}" \
      --test-command-dir "${testDir.test}" \
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
