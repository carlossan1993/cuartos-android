package com.odamus.app;

import java.io.File;
import java.io.IOException;

/** Only copies generated JSON/PNG files from this app's dedicated cache. */
final class ExportFilePolicy {
    static final long MAX_BYTES = 16L * 1024 * 1024;

    static File source(File cache, String path, String name, String mime) throws IOException {
        if (path == null || name == null || mime == null ||
            !name.matches("cuartos-[A-Za-z0-9_-]+\\.(json|png)") || name.length() > 100 ||
            !(mime.equals("application/json") && name.endsWith(".json") || mime.equals("image/png") && name.endsWith(".png")) ||
            !path.matches("cuartos-exports/[A-Za-z0-9_-]+/" + java.util.regex.Pattern.quote(name))) {
            throw new IOException("Invalid export");
        }
        File cacheRoot = cache.getCanonicalFile();
        File expectedRoot = new File(cacheRoot, "cuartos-exports");
        File root = expectedRoot.getCanonicalFile();
        File file = new File(cacheRoot, path).getCanonicalFile();
        if (!root.equals(expectedRoot) || !file.getPath().startsWith(root.getPath() + File.separator) || !file.isFile() || file.length() == 0 || file.length() > MAX_BYTES) {
            throw new IOException("Invalid export source");
        }
        return file;
    }
}
