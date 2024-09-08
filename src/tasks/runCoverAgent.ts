import { execSync as execSyncImport } from "child_process";

import { error, warning, debug } from "@actions/core";
import {getOctokit as getOctokitImport} from "@actions/github";
import {getTestFiles} from "./getTestFiles";

export interface FormattedCoverage {
    summary?: string;
    details?: string;
}

export const COVER_AGENT_ERROR_MESSAGE = "There was an error while running Cover Agent CLI.";

const runCoverAgent = async (
    githubToken: string,
    openAIKey: string,
    testCommand: string,
    reporter: string,
    execSyncParam?: (command: string) => Buffer,
) => {
    try {
        const refParts = process.env.GITHUB_REF.split('/');
        const prNumber = refParts[2]
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

        const execSync = execSyncParam ?? execSyncImport;

        console.log('Fetch changed files in the PR')
        const getOctokit = getOctokitImport;
        const github = getOctokit(githubToken);

        // Fetch changed files in the PR
        console.log('Fetch changed files in the PR')
        const { data: changedFiles } = await github.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: Number(prNumber),
        });

        console.log('Fetched changed files in the PR', changedFiles)

        const filePaths = changedFiles.map(file => file.filename);
        const testFiles = getTestFiles(filePaths, testCommand, reporter);

        console.log('Fetched Test files', testFiles);

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