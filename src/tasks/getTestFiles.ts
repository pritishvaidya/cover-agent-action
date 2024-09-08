import { exec as execSyncImport } from "child_process";

import { warning } from "@actions/core";

export const getTestFiles = (
    changedFiles: string[],
    testCommand: string,
    reporter: string,
) => {
    // Assuming your test files are located in a specific directory, adjust as necessary
    const relatedTestFiles = [];

    const relatedTestCommand = "--findRelatedTests";
    // You might want to use Jest to find related tests
    for (const file of changedFiles) {
        console.log(`Getting test files from ${file} ${testCommand}`);
        const command = `${testCommand} ${relatedTestCommand} ${file}`;
        try {
            console.log(`Retrieving ${file} ${command}`);

            execSyncImport(command);
            // Add logic to collect related test files here
            // For now, assuming we handle this simply
            relatedTestFiles.push(file); // Modify as per actual logic
        } catch (error) {
            warning(
                // @ts-expect-error error message
                `Failed to find related tests for ${file}: ${error.message}`,
            );
        }
    }

    return relatedTestFiles;
};
