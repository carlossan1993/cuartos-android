package com.carlossan1993.cuartos;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
