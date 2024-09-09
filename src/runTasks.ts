import { info, error, setFailed } from "@actions/core";

import gatherAllInputs from "./tasks/gatherAllInputs";
import postCommentImport from "./tasks/postComment";
import runCoverAgent from "./tasks/runCoverAgent";

const runTasks = async (
    getInputParam?: (key: string) => string,
    execSyncParam?: (command: string) => Buffer,
    postComment = postCommentImport,
): Promise<void> => {
    try {
        // @ts-expect-error process-env
        if (!process.env.GITHUB_REF.startsWith("refs/pull/")) {
            setFailed(
                "This action can only be run in the context of a pull request.",
            );
            return;
        }

        info(`Jest Coverage Commenter v2`);
        const inputs = gatherAllInputs(getInputParam);
        if (!inputs) {
            return;
        }
        const {
            githubToken,
            openAIKey,
            testCommand,
            reporter,
            commentPrefix,
            coveragePath,
            coverageType,
            desiredCoverage,
            maxIterations,
            additionalCoverAgentCommands,
        } = inputs;
        info("Inputs have been gathered");
        const coverAgentReport = runCoverAgent({
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
        });
        info("Cover Agent Unit Test Generator has been posted to the PR");
        if (!coverAgentReport) {
            return;
        }
        // await postComment(formattedCoverage, githubToken, commentPrefix);
        info("Comment has been posted to the PR");
    } catch (err) {
        error(err as Error);
        setFailed((err as Error)?.message);
    }
};

export default runTasks;
