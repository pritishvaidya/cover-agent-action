import {
    getInput as getInputImport,
    debug,
    setFailed,
    error,
} from "@actions/core";

export interface IInputs {
    githubToken: string;
    openAIKey: string;
    testCommand: string;
    reporter: string;
    commentPrefix: string;
    coveragePath: string;
    coverageType: string;
    desiredCoverage: string;
    maxIterations: string;
    additionalCoverAgentCommands: string;
}

export const NO_TOKEN_FAIL_MESSAGE =
    "No github token provided (input: github_token)";
export const NO_KEY_FAIL_MESSAGE =
    "No OpenAI API Key provided (input: openai_api_key)";
export const DEFAULT_TEST_COMMAND = "npx jest --coverage";
export const DEFAULT_REPORTER = "text";
export const DEFAULT_COMMENT_PREFIX = "## Jest Coverage";
export const POSSIBLE_REPORTERS = ["text", "text-summary", "cobertura"];
export const COVERAGE_PATH = "./coverage/coverage-cobertura.xml";
export const COVERAGE_TYPE = "cobertura";
export const DESIRED_COVERAGE = "100";
export const MAX_ITERATIONS = "2";
export const ADDITIONAL_COVER_AGENT_COMMANDS = " ";

const gatherAllInputs = (
    getInputParam?: (key: string) => string,
): IInputs | void => {
    try {
        const getInput = getInputParam ?? getInputImport;

        const githubToken = determineValue([getInput("github_token")]);
        debug(`Input - github_token: ${githubToken}`);
        if (!githubToken) {
            return setFailed(NO_TOKEN_FAIL_MESSAGE);
        }

        const openAIKey = determineValue([getInput("openai_api_key")]);
        debug(`Input - openai_api_key: ${openAIKey}`);
        if (!openAIKey) {
            return setFailed(NO_KEY_FAIL_MESSAGE);
        }

        const testCommand = determineValue(
            [getInput("test_command")],
            DEFAULT_TEST_COMMAND,
        );
        debug(`Input - test_command: ${testCommand}`);
        if (!testCommand) {
            return setFailed("No test command provided (input: test_command)");
        }

        const commentPrefix = determineValue([
            getInput("comment_prefix"),
            DEFAULT_COMMENT_PREFIX,
        ]);
        debug(`Input - comment_prefix: ${commentPrefix}`);
        if (!commentPrefix) {
            return setFailed(
                "No comment prefix provided (input: comment_prefix)",
            );
        }

        const reporter = determineValue(
            [getInput("reporter")],
            DEFAULT_REPORTER,
        );
        debug(`Input - reporter: ${reporter}`);
        if (!reporter || !POSSIBLE_REPORTERS.includes(reporter)) {
            throw new Error("Invalid reporter");
        }

        const coveragePath = determineValue([
            getInput("coverage_path"),
            COVERAGE_PATH,
        ]);
        debug(`Input - coverage_path: ${coveragePath}`);
        if (!coveragePath) {
            return setFailed(
                "No Cover Agent Params provided (input: coverage_path)",
            );
        }

        const coverageType = determineValue([
            getInput("coverage_type"),
            COVERAGE_TYPE,
        ]);
        debug(`Input - coverage_type: ${coverageType}`);
        if (!coverageType) {
            return setFailed(
                "No Cover Agent Params provided (input: coverage_type)",
            );
        }

        const desiredCoverage = determineValue([
            getInput("desired_coverage"),
            DESIRED_COVERAGE,
        ]);
        debug(`Input - desired_coverage: ${desiredCoverage}`);
        if (!desiredCoverage) {
            return setFailed(
                "No Cover Agent Params provided (input: desired_coverage)",
            );
        }

        const maxIterations = determineValue([
            getInput("max_iterations"),
            MAX_ITERATIONS,
        ]);
        debug(`Input - max_iterations: ${maxIterations}`);
        if (!maxIterations) {
            return setFailed(
                "No Cover Agent Params provided (input: max_iterations)",
            );
        }

        const additionalCoverAgentCommands = determineValue([
            getInput("additional_cover_agent_commands"),
            ADDITIONAL_COVER_AGENT_COMMANDS,
        ]);
        debug(
            `Input - additional_cover_agent_commands: ${additionalCoverAgentCommands}`,
        );
        if (!additionalCoverAgentCommands) {
            return setFailed(
                "No Cover Agent Params provided (input: additional_cover_agent_commands)",
            );
        }

        return {
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
        };
    } catch (err) {
        error("There was an error while gathering inputs");
        throw err;
    }
};

const determineValue = (
    valuesInOrderOfImportance: (string | undefined)[],
    defaultValue?: string,
): string | null | undefined => {
    for (const value of valuesInOrderOfImportance) {
        if (!isFalsyOrBlank(value)) {
            return value;
        }
    }
    if (defaultValue) {
        return defaultValue;
    }
    return null;
};

/**
 * GitHub Actions getInput returns blank strings, not null.
 * @param value
 */
const isFalsyOrBlank = (value: string | undefined): boolean => {
    return !value || value === "";
};

export default gatherAllInputs;
