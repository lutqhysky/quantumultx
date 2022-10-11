url = $request.url;
let obj = JSON.parse($response.body);
 obj= {
  "status" : 0,
  "receipt" : {
    "receipt_type" : "Production",
    "app_item_id" : 1306893526,
    "receipt_creation_date" : "2022-09-21 11:40:33 Etc/GMT",
    "bundle_id" : "com.staysorted.Sorted",
    "original_purchase_date" : "2020-08-12 00:06:22 Etc/GMT",
    "in_app" : [

    ],
    "adam_id" : 1306893526,
    "receipt_creation_date_pst" : "2022-09-21 04:40:33 America/Los_Angeles",
    "request_date" : "2022-09-21 11:40:35 Etc/GMT",
    "request_date_pst" : "2022-09-21 04:40:35 America/Los_Angeles",
    "version_external_identifier" : 852189251,
    "request_date_ms" : "1663760435501",
    "original_purchase_date_pst" : "2020-08-11 17:06:22 America/Los_Angeles",
    "application_version" : "358",
    "original_purchase_date_ms" : "1597190782000",
    "receipt_creation_date_ms" : "1663760433000",
    "original_application_version" : "185",
    "download_id" : 83070431858296
  },
  "isPro" : true,
  "environment" : "Production",
  "flagged" : false,
  "isBundleEnabled" : true,
  "isCustomer" : false
};
$done({body:JSON.stringify(obj)});
