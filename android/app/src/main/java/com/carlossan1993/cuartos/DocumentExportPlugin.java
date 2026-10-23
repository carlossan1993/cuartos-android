package com.carlossan1993.cuartos;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "CuartosDocument")
public class DocumentExportPlugin extends Plugin {
    private final AtomicBoolean pending = new AtomicBoolean(false);

    @PluginMethod
    public void save(PluginCall call) {
        if (!pending.compareAndSet(false, true)) { call.reject("Export in progress"); return; }
        try {
            source(call);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(call.getString("mime"));
            intent.putExtra(Intent.EXTRA_TITLE, call.getString("name"));
            getActivity().runOnUiThread(() -> {
                try { startActivityForResult(call, intent, "createdDocument"); }
                catch (Exception error) { pending.set(false); call.reject("Could not open document picker"); }
            });
        } catch (Exception error) { pending.set(false); call.reject("Could not open document picker"); }
    }

    private File source(PluginCall call) throws IOException {
        return ExportFilePolicy.source(getContext().getCacheDir(), call.getString("path"), call.getString("name"), call.getString("mime"));
    }

    @ActivityCallback
    private void createdDocument(PluginCall call, ActivityResult result) {
        if (call == null) { pending.set(false); return; }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            pending.set(false); call.resolve(new JSObject().put("status", "cancelled")); return;
        }
        Uri uri = result.getData().getData();
        if (!"content".equals(uri.getScheme())) { pending.set(false); call.reject("Invalid document provider"); return; }
        execute(() -> {
            try {
                File file = source(call);
                try (FileInputStream input = new FileInputStream(file); OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IOException("No output stream");
                    byte[] buffer = new byte[8192];
                    int read; long total = 0;
                    while ((read = input.read(buffer)) != -1) {
                        total += read;
                        if (total > ExportFilePolicy.MAX_BYTES) throw new IOException("Export exceeds limit");
                        output.write(buffer, 0, read);
                    }
                    output.flush();
                }
                call.resolve(new JSObject().put("status", "saved"));
            } catch (Exception error) {
                // ACTION_CREATE_DOCUMENT creates a new document; it never replaces an existing file.
                try { DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); } catch (Exception ignored) { }
                call.reject("Could not save document");
            } finally { pending.set(false); }
        });
    }
}
