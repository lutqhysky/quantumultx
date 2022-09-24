url = $request.url;
let obj = JSON.parse($response.body);
 obj={
  "error" : 0,
  "data" : {
    "user_info" : {
      "is_expired" : 0,
      "play_token" : "F0ED6D6872782A1B0A67BBD1C3257C1618919DB32B116CF8F06D8E68815ED4A043AE5F26DE7B7F50872055FD71DD5635B07CC3EB0EEC3395553BE79B824CDCA3",
      "expired_time" : 1884988327,
      "is_vip" : "9A0684792021D73BE42B71491469ADFA",
      "clean_id" : "39E71CC1F4A8F59725C62BE3AAAD424E"
    },
    "error_code" : "",
    "data_info" : [

    ],
    "is_success" : true,
    "error_msg" : ""
  }
};
$done({body:JSON.stringify(obj)});
