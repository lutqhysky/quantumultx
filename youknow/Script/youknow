var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const Vipdate = '/api/app/user/info';
const vip = '/api/app/comics/detail';
const lock = '/api/app/comicsChapter/isLook';
const movielock = '/api/app/media/play';

if (url.indexOf(Vipdate) != -1) { 
    obj.data = "zDrMBCBZLbv7W87ryP67nHVLc+z41gT5iVc/IqsM8n7J22Uu+exg/zwlUb6qgWhYejgN9S7y+Gk4fafX56ncfmV8OTn9Dyb6m2nmcUJZKEAhep64gDclkgibGycchsLYSQXxflQkwBEiRkwhuLUGTeXScW2LxnMOkp0PFEgoBtY3T7pyvLOcp/h+zBey6THS0FtIE1YNeM+vB6uk/OwuxqnGCzQw13bIJbGzGh4TpbcF3vPQklTKbxKUUjEgDRDsZP5msED/Wi5Mwg2qwDpiMDhoACI9mF4YZUPJOsB/FW99rlj0W28is874nVHKj+MXALEFq1u9IW6TfA6IkeZxyswf/lKymAnM0BuHLqtfzuPXWDksU2JrN0TDXD8c48baA+7unIt5oSu/y2m60Hj1t9RYeoiLU+xMWP8skMW/nfxos8Lg+878T4k3xwwSg3vDnwcg2NWnmrnAPzWUG9ymUtjn/TpbNF6vPCnZQ2lKL5rjPCvqGuP5iisf2NMd8Q8ZNCshF+cHK6vgMe2V3AULQ7yFONyUqE00lfa6m9imfJvntZDKshPTuq0bF72gdKwDqhcGGiI/iGMBe11DqQqQrUyakBLVtwEvdbsTh8Az3RnTfqVT1azLijbhY2Lu5OJ+mCII860Q5v8yiesFuxwGE0007sRUHqf8ZygmNwhth71pBfmBN8QRxtyOciskxKKf9sVVyXrTpH7HpNc89kkOBo6EpAb38T09uMe7nq2eNQDzNWP4hsvLy7mzGUTlfjXcCHQtBg4tVQhu0KlrbgaOh1X1H/okszcOjE6FWyTPQUq3YpeB/uaalhBUDnSjn2oJePbtoUDujyCLsEYihd9cSYEwSlGERnlyciHUjet7kaQI4DmKNxA/kZewCuQsxLbD6FDxuYSazArG8kqdBFUzHdlimULWaBjmyS5EiaF5rff7w86thDwnmHMLcTDuBzSZalSyCQiV9VSTz9c9PMHt+VYQIMthbzEQg0Z7qAXUSA1gDXiK+3WsaoeAvBJpkWfFXTCV1djFlOedBtDoGIPSS4S22eB5ka9T6ih5gsxtnno2Gbhw1P3KzrCgwwhO47dms7O4cFfcIIOzINWh66VYXh3RO/8XdjTojcPaI5pGAr5jyj4AEpBytT84wAzMy5kbu9XVXNXe8tvKy92+cohJnLB0rCsl2SXdtXe9nZ8WPu+d8q0IiCLrINtIro1SOyU7NYv++VRnU6sPYdsNkKOZDZeygs/UfvGqh27RvYnOLn5vt9spV8pSM3s4cnzp9Kj+CgKY5nNlR3s326MZL7FOWb1WuYDOUBb0FA6MfHx184ynP5YXG2hNOSURh7j51uB74asBJjjPf6JHJvYFQJKU4GAlZgIxED7tKV2URxhpP4YnQxJZbP1WAZmOgJPzXjI5WFw4DnfkIT5PhKM1IsPbnJJN5vJ6pGhSZS0uBMq0NUrXJVhp18Y0qa1+zlKA8lu/O1KiuS5xgGmOF4l/gHG/Jr6GFdZQUhXa8CxDGtaztlF9QmgRySFOcFmcZYmk7tvDROecTj7F1CQr+jrNSsGpLZq2ufKOIuNnoMLI4MK/chyHF7+3ptPcQK1ZaXWkg7nyiWw7MDmSUU7uxfCYIEf1wGHOsu+pTtqg/BumBrCqiltBXW2dBaYIE6gPEKYR4Y58n0mdTft22JWQ7yRblCSAh2Qi6d7uuRtVT1UHFNLsZs21WcFY0/iotx6kPuTt2+QOjPkT13pL0tH5Nbc6MZdK+FzI3v4Kv4duw6S6WzZbTU2Ob20wzmDsq2mAJnHMNe65fvojCxY//A+oVjwR8Mi/CLx9TePDHqwA9HtlbFzPUvBv9jiTx5NSv2NbiVVmP0gOEEeuCq3E7SqWxginbIdHF+jLIrGC1fnfJmak13k0cGX8UTaymA3D38DQIwXFMA0jWT0oS+Rq6KrY4AuZ";
 body = JSON.stringify(obj);  
 } 
if ($request.url.indexOf(vip) != -1){
    body = $response.body.replace(/isFree":\w+/g, 'isFree":true').replace(/isBuy":\w+/g, 'isBuy":true');
}
if ($request.url.indexOf(lock) != -1){
    body = $response.body.replace(/code":\d+/g, 'code":200').replace(/isBuy":\w+/g, 'isBuy":true').replace(/playable":\w+/g, 'playable":true');
}
if ($request.url.indexOf(movielock) != -1){
    body = $response.body.replace(/code":\d+/g, 'code":200').replace(/isBuy":\w+/g, 'isBuy":true').replace(/playable":\w+/g, 'playable":true');
}
$done({body}); 
