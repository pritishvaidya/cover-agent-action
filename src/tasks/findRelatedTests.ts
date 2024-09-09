import fs from "fs/promises";
import * as console from "node:console";
import path from "path";

/**
 * Finds files with names similar to the base name of the given filePath in the same directory.
 * @param filePath - The path to the file whose base name is used for finding similar files.
 * @returns A promise that resolves to an array of similar file paths.
 */
const findSimilarNamedFiles = async (filePath: string): Promise<string[]> => {
    try {
        // Extract the base name from the filePath
        const baseName = path.basename(filePath, path.extname(filePath));
        console.log("Basename ", baseName);

        // Get the directory containing the filePath
        const dirName = path.dirname(filePath);
        console.log("dirName ", dirName);

        // Read the contents of the directory
        const files = await fs.readdir(dirName);
        console.log("files ", files);

        // Find files with similar names
        const similarFiles = files.filter((file) => {
            const fileBaseName = path.basename(file, path.extname(file));
            console.log({
                file,
                baseName,
                fileBaseName,
                pathName: path.basename(filePath),
            });
            return (
                file.includes(baseName) &&
                fileBaseName.includes("test") &&
                file !== path.basename(filePath)
            );
        });
        console.log("similarFiles ", similarFiles);

        // Resolve with the list of similar file paths
        return similarFiles.map((file) => path.join(dirName, file));
    } catch (err) {
        console.error("Error finding similar named files:", err);
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
        const similarFiles = await findSimilarNamedFiles(filePath);

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
