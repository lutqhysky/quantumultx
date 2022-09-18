url = $request.url;
let obj = JSON.parse($response.body);

    obj={
  "code": 20000,
  "message": "Success",
  "data": {
    "level": {
      "code": "msk.trial",
      "purchased_at": "2022-09-18 18:32:47",
      "expired_at": "2099-10-18 18:32:47",
      "created_at": "2022-09-18 18:32:51"
    },
    "history": {
      "msk.trial": {
        "original_transaction_id": "430001224796127",
        "code": "msk.trial",
        "purchased_at": "2022-09-18 18:32:47",
        "expired_at": "2099-10-18 18:32:47",
        "created_at": "2022-09-18 18:32:51"
      }
    }
  }
};
$done({body:JSON.stringify(obj)});
