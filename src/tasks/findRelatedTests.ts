import { exec } from "child_process";
import path from "path";

/**
 * Finds related test files for a given source file using Jest.
 * @param filePath - The path to the source file for which to find related tests.
 * @returns A promise that resolves to an array of related test file paths.
 */
const findRelatedTests = (
    filePath: string,
    testCommand: string,
): Promise<{ filePath: string; testPath: string }[]> => {
    // Resolve the absolute path to the file
    const resolvedFilePath = path.resolve(filePath);
    console.log(`Fetched Test files for ${filePath}`);

    // Construct the Jest command to find related tests
    const command = `${testCommand} --findRelatedTests ${resolvedFilePath}`;

    return new Promise<{ filePath: string; testPath: string }[]>(
        (resolve, reject) => {
            // Execute the Jest command
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new Error(`Error executing command: ${error.message}`),
                    );
                    return;
                }
                if (stderr) {
                    reject(new Error(`Jest stderr: ${stderr}`));
                    return;
                }

                // Process the stdout output to get the list of related test files
                const relatedTests = stdout
                    .split("\n")
                    .filter((line) => line.trim() !== "");

                const seenTestPaths = new Set<string>();
                const uniqueRelatedTests = relatedTests.reduce<
                    { filePath: string; testPath: string }[]
                >((acc, testPath) => {
                    if (!seenTestPaths.has(testPath)) {
                        seenTestPaths.add(testPath);
                        acc.push({ filePath: resolvedFilePath, testPath });
                    }
                    return acc;
                }, []);

                resolve(uniqueRelatedTests);
            });
        },
    );
};

export default findRelatedTests;
