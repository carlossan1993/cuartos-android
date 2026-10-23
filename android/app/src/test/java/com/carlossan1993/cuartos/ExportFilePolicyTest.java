package com.carlossan1993.cuartos;

import static org.junit.Assert.*;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ExportFilePolicyTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();

    private File generated(String path) throws IOException {
        File file = new File(temporary.getRoot(), path);
        assertTrue(file.getParentFile().mkdirs() || file.getParentFile().isDirectory());
        Files.write(file.toPath(), new byte[] {1, 2, 3});
        return file;
    }
    private void rejected(String path, String name, String mime) {
        assertThrows(IOException.class, () -> ExportFilePolicy.source(temporary.getRoot(), path, name, mime));
    }
    @Test public void acceptsOnlyGeneratedJsonAndPngInCache() throws IOException {
        for (String extension : new String[] {"json", "png"}) {
            String name = "cuartos-Casa." + extension, path = "cuartos-exports/session-1/" + name;
            File file = generated(path);
            assertEquals(file.getCanonicalFile(), ExportFilePolicy.source(temporary.getRoot(), path, name, extension.equals("json") ? "application/json" : "image/png"));
        }
    }
    @Test public void blocksTraversalAbsolutePathsAndUnrelatedFiles() throws IOException {
        generated("private/cuarto.json");
        rejected("cuartos-exports/../private/cuarto.json", "cuarto.json", "application/json");
        rejected("/private/cuarto.json", "cuartos-casa.json", "application/json");
        rejected("private/cuarto.json", "cuartos-casa.json", "application/json");
    }
    @Test public void blocksMismatchedNamesMimeAndMissingFiles() throws IOException {
        generated("cuartos-exports/one/cuartos-Casa.json");
        rejected("cuartos-exports/one/cuartos-Casa.json", "cuartos-Casa.png", "image/png");
        rejected("cuartos-exports/one/cuartos-Casa.json", "cuartos-Casa.json", "image/png");
        rejected("cuartos-exports/missing/cuartos-Casa.json", "cuartos-Casa.json", "application/json");
        rejected(null, "cuartos-Casa.json", "application/json");
    }
    @Test public void blocksSymlinksEscapingTheExportDirectory() throws IOException {
        File secret = generated("private/secret.json");
        File folder = new File(temporary.getRoot(), "cuartos-exports/linked");
        assertTrue(folder.mkdirs());
        Files.createSymbolicLink(new File(folder, "cuartos-Casa.json").toPath(), secret.toPath());
        rejected("cuartos-exports/linked/cuartos-Casa.json", "cuartos-Casa.json", "application/json");
        File outside = generated("external/one/cuartos-Casa.json");
        File otherCache = temporary.newFolder("cache");
        Files.createSymbolicLink(new File(otherCache, "cuartos-exports").toPath(), outside.getParentFile().getParentFile().toPath());
        assertThrows(IOException.class, () -> ExportFilePolicy.source(otherCache, "cuartos-exports/one/cuartos-Casa.json", "cuartos-Casa.json", "application/json"));
    }
    @Test public void enforcesTheByteLimitBeforeOpeningAChooser() throws IOException {
        String path = "cuartos-exports/one/cuartos-Casa.png";
        File file = generated(path);
        try (RandomAccessFile data = new RandomAccessFile(file, "rw")) { data.setLength(ExportFilePolicy.MAX_BYTES + 1); }
        rejected(path, "cuartos-Casa.png", "image/png");
        try (RandomAccessFile data = new RandomAccessFile(file, "rw")) { data.setLength(0); }
        rejected(path, "cuartos-Casa.png", "image/png");
    }
}
