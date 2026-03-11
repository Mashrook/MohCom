#import <Capacitor/Capacitor.h>

CAP_PLUGIN(StoreKitPlugin, "StoreKitPlugin",
    CAP_PLUGIN_METHOD(purchase, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restore, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getEntitlement, CAPPluginReturnPromise);
)
