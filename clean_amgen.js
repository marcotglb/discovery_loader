const {Pool, Client} = require('pg');
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
var fs = require('fs');
var sleep = require('system-sleep');
const collection = {
    environment_id: 'b1b0f257-c6af-4724-95c4-dc9a7e9f2231',
    collection_id: '6c7137ec-440c-4a61-87f4-37ce6f6f13be'
};



process.env.VCAP_SERVICES = process.env.VCAP_SERVICES || fs.readFileSync('./credentials_amgen.json', 'utf-8');

var discovery = new DiscoveryV1({
    //username: '7f17eab1-733f-4be5-a6c1-90ebdfe86ba1',
    //password: 'Q3Kb7Nmlodg2',
    version_date: '2018-03-05'
});




var listDocs = function (query, callback) {
    var params = collection;
    params.query = query;
    rows = true;
    while (rows)
    {
        console.log("discovery.query");
        discovery.query(params, (error, data) => {
            if (error) {
                console.error(error);
                return;
            }

            console.log('docs found:', data.results.length);
            rows = false;
            for (var i in data.results)
            {
                rows = true;
                console.log(data.results[i].id);
                callback(data.results[i].id);

            }

        });
        sleep(5000);
    }
};


listDocs("", (res) => {
    var params = collection;
    params.document_id = res;
    discovery.deleteDocument(params, function (error, data) {
        console.log(JSON.stringify(data, null, 2));
    });
});


