import fs from "fs/promises";
import * as console from "node:console";
import path from "path";

// Function to recursively search for test files
const findTestFilesInDir = async (
    dirPath: string,
    baseName: string,
): Promise<string[]> => {
    const result: string[] = [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "tests" || entry.name === "__tests__") {
                    // If the directory is a test directory, look for test files within it
                    const testFiles = await findTestFilesInDir(
                        fullPath,
                        baseName,
                    );
                    result.push(...testFiles);
                } else {
                    // Recurse into other directories
                    const subDirResults = await findTestFilesInDir(
                        fullPath,
                        baseName,
                    );
                    result.push(...subDirResults);
                }
            } else if (entry.isFile()) {
                // Check if the file is a test file
                const fileBaseName = path.basename(
                    entry.name,
                    path.extname(entry.name),
                );
                if (
                    fileBaseName.includes(baseName) &&
                    fullPath.includes(".test")
                ) {
                    result.push(fullPath);
                }
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }

    return result;
};

// Main function to find test files related to the given file
const findTestFiles = async (filePath: string): Promise<string[]> => {
    try {
        // Extract the base name of the file (without extension)
        const baseName = path.basename(filePath, path.extname(filePath));

        // Get the directory containing the given file path
        const dirName = path.dirname(filePath);

        // Search for test files in the given directory
        return await findTestFilesInDir(dirName, baseName);
    } catch (err) {
        console.error("Error finding test files:", err);
        return [];
    }
};

/**
 * Finds related test files for a given source file by searching for files with similar names.
 * @param filePath - The path to the source file for which to find related tests.
 * @returns A promise that resolves to an array of related test file paths.
 */
const findRelatedTests = async (
    filePath: string,
): Promise<{ filePath: string; testPath: string }[]> => {
    try {
        console.log(`Finding related test files for ${filePath}`);
        if(filePath.includes(".test") || filePath.includes("__tests__")) {
            return []
        }

        // Find files with similar names in the same directory
        const similarFiles = await findTestFiles(filePath);

        // Prepare the result in the format { filePath, testPath }
        const result = similarFiles.map((testPath) => ({
            filePath,
            testPath,
        }));
        console.log(
            `Found related test files for ${filePath} with ${similarFiles}`,
        );

        return result;
    } catch (err) {
        console.error("Error finding related tests:", err);
        return [];
    }
};

export default findRelatedTests;
