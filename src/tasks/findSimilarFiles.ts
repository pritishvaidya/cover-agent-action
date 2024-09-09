import fs from "fs/promises";
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

        // Get the directory containing the filePath
        const dirName = path.dirname(filePath);

        // Read the contents of the directory
        const files = await fs.readdir(dirName);

        // Find files with similar names
        const similarFiles = files.filter((file) => {
            const fileBaseName = path.basename(file, path.extname(file));
            return (
                fileBaseName.includes(baseName) &&
                file !== path.basename(filePath)
            );
        });

        // Resolve with the list of similar file paths
        return similarFiles.map((file) => path.join(dirName, file));
    } catch (err) {
        console.error("Error finding similar named files:", err);
        return [];
    }
};

export default findSimilarNamedFiles;
