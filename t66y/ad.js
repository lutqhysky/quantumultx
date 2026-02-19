let body = $response.body;

let inject = `
<script>
document.addEventListener("DOMContentLoaded", function(){

    if (typeof dlData !== "undefined") {
        document.querySelector(".list").innerHTML = dlData;
    }

});
</script>
`;

body = body.replace("</body>", inject + "</body>");

$done({ body });