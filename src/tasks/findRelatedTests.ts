import fs from "fs/promises";
import * as console from "node:console";
import path from "path";

const findTestFiles = async (filePath: string): Promise<string[]> => {
    try {
        // Extract the base name of the file (without extension)
        const baseName = path.basename(filePath, path.extname(filePath));

        // Define potential test directories
        const potentialDirs = ["tests", "__tests__"];

        // Get the directory containing the given file path
        const dirName = path.dirname(filePath);

        // Function to find files in a given directory
        const findFilesInDir = async (directory: string): Promise<string[]> => {
            try {
                return await fs.readdir(directory);
            } catch (err) {
                console.error(`Error reading directory ${directory}:`, err);
                return [];
            }
        };

        // Function to check if the directory contains test files
        const checkForTestFiles = async (
            directory: string,
        ): Promise<string[]> => {
            const similarFiles: string[] = [];
            for (const dir of potentialDirs) {
                const testDirPath = path.join(directory, dir);
                const files = await findFilesInDir(testDirPath);

                // Filter files based on base name and presence of "test"
                const matchedFiles = files.filter((file) => {
                    const fileBaseName = path.basename(
                        file,
                        path.extname(file),
                    );
                    return fileBaseName.includes(baseName);
                });

                // Add matched files with their full path
                similarFiles.push(
                    ...matchedFiles.map((file) => path.join(testDirPath, file)),
                );
            }
            return similarFiles;
        };

        // Check the parent directory and potential test directories
        const testFiles = await checkForTestFiles(dirName);
        console.log("Test Files", testFiles);
        return testFiles;
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
