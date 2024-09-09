import { execSync as execSyncImport } from "child_process";

import { error, warning, debug } from "@actions/core";
import { getOctokit as getOctokitImport } from "@actions/github";

import findRelatedTests from "./findRelatedTests";

export interface FormattedCoverage {
    summary?: string;
    details?: string;
}

export const COVER_AGENT_ERROR_MESSAGE =
    "There was an error while running Cover Agent CLI.";

const runCoverageCommand = async ({
    file,
    testFile,
    coveragePath = "./coverage/cobertura-coverage.xml",
    testCommand,
    coverageType = "cobertura",
    desiredCoverage = "100",
    maxIterations = "2",
    additionalCoverAgentCommands,
}: {
    file: string;
    testFile: string;
    coveragePath: string;
    testCommand: string;
    coverageType: string;
    desiredCoverage: string;
    maxIterations: string;
    additionalCoverAgentCommands: string;
}): Promise<string> => {
    return new Promise((resolve, reject) => {
        const command = `cover-agent \
          --source-file-path "${file}" \
          --test-file-path "${testFile}" \
          --code-coverage-report-path "${coveragePath}" \
          --test-command "${testCommand}" \
          --coverage-type "${coverageType}" \
          --desired-coverage ${desiredCoverage} \
          --max-iterations ${maxIterations} \
          ${additionalCoverAgentCommands}`;

        console.log(`Executing command: ${command}`);

        resolve(command);

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
};

const runCoverAgent = async ({
    githubToken,
    openAIKey,
    testCommand,
    reporter,
    execSyncParam,
    commentPrefix,
    coverageType,
    coveragePath,
    desiredCoverage,
    maxIterations,
    additionalCoverAgentCommands,
}: {
    githubToken: string;
    openAIKey: string;
    testCommand: string;
    reporter: string;
    execSyncParam: ((command: string) => Buffer) | undefined;
    commentPrefix: string;
    coverageType: string;
    coveragePath: string;
    desiredCoverage: string;
    maxIterations: string;
    additionalCoverAgentCommands: string;
}) => {
    try {
        // @ts-expect-error process-env
        const refParts = process.env.GITHUB_REF.split("/");
        const prNumber = refParts[2];
        // @ts-expect-error process-env
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

        const execSync = execSyncParam ?? execSyncImport;

        console.log("Fetch changed files in the PR");
        const getOctokit = getOctokitImport;
        const github = getOctokit(githubToken);

        // Fetch changed files in the PR
        console.log("Fetch changed files in the PR");
        const { data: changedFiles } = await github.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: Number(prNumber),
        });

        const coveragePromises: Promise<string>[] = [];
        for (const file of changedFiles) {
            const testFiles = await findRelatedTests(
                file.filename,
                testCommand,
            );
            console.log(`Fetched test files for ${file.filename}:`, testFiles);

            for (const { testPath } of testFiles) {
                const coveragePromise = runCoverageCommand({
                    file: file.filename,
                    testFile: testPath,
                    coveragePath,
                    testCommand,
                    coverageType,
                    desiredCoverage,
                    maxIterations,
                    additionalCoverAgentCommands,
                });
                coveragePromises.push(coveragePromise);
            }
        }

        // Wait for all coverage commands to complete
        await Promise.all(coveragePromises);
        console.log("All coverage commands executed successfully");

        // const filePaths = changedFiles.map((file) => file.filename);
        // console.log("Fetched changed files in the PR", changedFiles);
        //
        // const testFiles = findRelatedTests(filePaths, testCommand);
        // console.log("Fetched Test files", testFiles);
        //
        // for (const testFile of testFiles) {
        //     await runCoverageCommand(te, testFile, testCommand, coverageType, desiredCoverage, maxIterations);
        // }

        //         const codeCoverage = execSync(testCommand).toString();
        //         try {
        //             if (reporter === "text-summary") {
        //                 return processTextSummaryReporter(codeCoverage);
        //             }
        //             return processTextReporter(codeCoverage);
        //         } catch (innerError) {
        //             warning(
        //                 "Something went wrong with formatting the message, returning the entire text instead. Perhaps you didn't run Jest with --coverage?",
        //             );
        //             return {
        //                 details: `\`\`\`
        // ${codeCoverage}
        // \`\`\``,
        //             };
        //         }
    } catch (err) {
        error(COVER_AGENT_ERROR_MESSAGE);
        throw err;
    }
};

export default runCoverAgent;
