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
        const runner = core.getInput('runner');

        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const prNumber = process.env.GITHUB_REF.split('/')[2];
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

        const openApiKey = 'testKey' || process.env.OPENAI_API_KEY;

        // Ensure Vitest is installed and find its path
        const testPath = path.join(process.env.GITHUB_REPOSITORY, `node_modules/.bin/${runner}`);
        if (!fs.existsSync(testPath)) {
            core.setFailed(`${runner} is not installed in node_modules/.bin`);
            return;
        }

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
        console.log({ changedFiles, newBranchName, newPRTitle, newPRBody });

        const filePaths = changedFiles.map(file => file.filename);
        const testFiles = await getTestFiles(filePaths, testPath);

        for (const testFile of testFiles) {
            await runCoverageCheck(testFile, testCommand, coverageType, desiredCoverage, maxIterations);
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

async function getTestFiles(changedFiles, testPath) {
    // Assuming your test files are located in a specific directory, adjust as necessary
    console.log(`Getting test files from ${changedFiles} ${testPath}`);
    const testDir = 'tests'; // Adjust to your test directory
    const relatedTestFiles = [];

    // You might want to use Jest to find related tests
    for (const file of changedFiles) {
        const command = `npx ${testPath} run --config vitest.config.v2.mjs related ${file}`;
        try {
            console.log(`Retrieving ${file} ${command}`);

            await execPromise(command);
            // Add logic to collect related test files here
            // For now, assuming we handle this simply
            relatedTestFiles.push(file); // Modify as per actual logic
        } catch (error) {
            core.warning(`Failed to find related tests for ${file}: ${error.message}`);
        }
    }

    return relatedTestFiles;
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

function runCoverageCheck(file, testFile, testCommand, coverageType, desiredCoverage, maxIterations) {
    return new Promise((resolve, reject) => {
        const command = `cover-agent \
          --source-file-path "${file}" \
          --test-file-path "${testFile}" \
          --code-coverage-report-path "./coverage/cobertura-coverage.xml" \
          --test-command "${testCommand}" \
          --coverage-type "${coverageType}" \
          --desired-coverage ${desiredCoverage} \
          --max-iterations ${maxIterations}`;

        console.log(`Executing command: ${command}`);

        // execPromise(command)
        //     .then((code) => {
        //         console.log(`cover-agent exited with code ${code}`);
        //         resolve(code);
        //     })
        //     .catch((error) => {
        //         console.error(`Error: ${error.message}`);
        //         reject(error);
        //     });
    });
}

// Run the main function
run();
