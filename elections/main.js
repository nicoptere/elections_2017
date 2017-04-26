
if(!config) console.error("Config not set! Make a copy of 'config_template.js', add in your access token, and save the file as 'config.js'.");

mapboxgl.accessToken = config.accessToken;

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v8',
    center: [2.65,46.25],
    zoom: 5,
    pitch: 0,
    heading: 100,
    hash: true
});

map.on("load", function() {

    fileLoader.load( [
        "glsl/vs.glsl",
        "glsl/fs.glsl",
        "../data/raw/france.geojson",
        "../data/cities.csv",
        "../data/results.csv",
        "../data/indices.txt"
    ], initMesh );

    // Initialize threebox
    window.threebox = new Threebox(map);
    threebox.setupDefaultLights();

});

function distance( a,b ){
    var dx = a[0]-b[0];
    var dy = a[1]-b[1];
    return Math.sqrt( dx*dx + dy*dy );
}
function getTriangleArea( tri, points ){

    var A = points[ tri[ 0 ] ];
    var B = points[ tri[ 1 ] ];
    var C = points[ tri[ 2 ] ];
    return  .5 * ( distance( A, B) * distance( A, C ) );

}
function initMesh() {

    var citiesData = fileLoader.cities.split("\n")
        .filter(function (str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').length != 0;
        })
        .map(function (str) {
            return str.split(',')
                .map(function (s) {
                    if (!isNaN(parseFloat(s)))return parseFloat(s);
                    return s;
                });
        })
    var cities = {};
    citiesData.forEach(function (input) {

        if( input[1] > -5 && input[1] < 10
        &&  input[2] > 40) cities[input[0]] = [input[1], input[2]]
    })
    // console.log( cities["l abergement clemenciat"] );


    var names = [];
    var results = fileLoader.results.split("\n")
        .filter(function (str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').length != 0;
        })
        .map(function (str, id) {
            var s = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            // s = s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            return s.split(',')
                .map(function (s, i) {
                    if (!isNaN(parseFloat(s)))return parseFloat(s);
                    if (id > 0 && i > 0) {
                        if (names.indexOf(s) == -1)names.push(s);
                    }
                    return i == 0 ? s.replace(/['-]/gi, ' ') : s;
                });
        });
    //remove columns descriptions
    results.shift();


    //parse the data

    //crée un hashmap avec les noms des candidats comme clé pour stocker leurs résultats par ville

    var knownLocation = 0;
    var inscrits = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    var votants = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    var valides = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

    // var colors = [0xed6a5a, 0xf4f1bb, 0x9bc1bc, 0x5ca4a9, 0xe6ebe0, 0xf0b67f, 0xfe5f55, 0xd6d1b1, 0xc7efcf, 0xeef5db, 0x50514f, 0xf25f5c, 0xffe066, 0x247ba0, 0x70c1b3 ];

    var colors = "264653-2a9d8f-e9c46a-f4a261-e76f51".split('-').map( function( v ){ return parseInt( "0x" + v ); } );
    colors = colors.concat( "f2f3ae-edd382-e7a977-e87461-b38cb4".split('-').map( function( v ){ return parseInt( "0x" + v ); } ) );
    colors = colors.concat( "114b5f-456990-028090-79b473-70a37f".split('-').map( function( v ){ return parseInt( "0x" + v ); } ) );



    var candidats = {};
    var minmax = {};
    var colorIds = [];
    names.forEach(function (name, i) {
        candidats[name] = [];
        minmax[name] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        colorIds.push( i / (names.length-1) );
    });

    var coords = [];
    results.forEach(function (value, i) {

        if (cities[value[0]] != null) {

            knownLocation++;
            coords.push(cities[value[0]]);

        }else{
            //city not found
            return;
        }

        //inscrits
        var ins = value[1];
        inscrits[0] = Math.min(ins, inscrits[0]);
        inscrits[1] = Math.max(ins, inscrits[1]);

        //votants
        var vot = value[2];
        votants[0] = Math.min(vot, votants[0]);
        votants[1] = Math.max(vot, votants[1]);

        //ont voté (vote ni blanc, ni nul )
        var val = value[3];
        valides[0] = Math.min(val, valides[0]);
        valides[1] = Math.max(val, valides[1]);

        //stores the scores for each candidate
        var id = 4;
        while (id < value.length) {

            var n = value[id++];
            var v = value[id++] / val;

            minmax[n][0] = Math.min(v, minmax[n][0]);
            minmax[n][1] = Math.max(v, minmax[n][1]);

            candidats[n].push( v );
        }

    });

    //retrieves the indices
    var indices = fileLoader.indices.split( ',' ).map( function(v){return parseInt( v ); });

    //computes the vertices
    var vertices = [];
    var obj = new THREE.Object3D();
    coords.forEach( function(coord){
        // computes a specific geographic coordinate (lon/lat)
        threebox.addAtCoordinate(obj, coord );
        //obj.position now contains the position in the 3D space
        vertices.push(obj.position.x, obj.position.y, 0 );
    });


    var container = document.getElementById("btns");
    var btn = document.createElement("button");
    container.appendChild(btn);
    btn.innerText = "tous";
    btn.addEventListener("mousedown", function(e){
        meshes.forEach( function(m){ m.visible = true; } );
        btns.forEach( function(b){ b.checked = true; } );
    });

    btn = document.createElement("button");
    container.appendChild(btn);
    btn.innerText = "aucun";
    btn.addEventListener("mousedown", function(e){
        meshes.forEach( function(m){ m.visible = false; } );
        btns.forEach( function(b){ b.checked = false; } );
    });

    btn = document.createElement("button");
    container.appendChild(btn);
    btn.innerText = "bascule";
    btn.addEventListener("mousedown", function(e){
        meshes.forEach( function(m){ m.visible = !m.visible; } );
        btns.forEach( function(b){ b.checked = b.mesh.visible; } );
    });
    container.appendChild( document.createElement("hr"));

    //iterates over the candidates to retrieve their scores and build a mesh
    var id = 0;
    var meshes = [];
    var materials = [];
    var btns = [];
    for( var k in candidats ){

        var scores = candidats[ k ];
        var votes = [];
        scores.forEach( function( result ){
            votes.push( result );
        });

        var geom = new THREE.BufferGeometry();
        geom.addAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geom.addAttribute("votes", new THREE.BufferAttribute(new Float32Array(votes), 1));
        geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

        var mat = new THREE.ShaderMaterial({
            uniforms: {
                minmax: {type:"v2", value: new THREE.Vector2( minmax[k][0], minmax[k][1] ) },
                color: {type:"f", value: new THREE.Color( colors[id] ) },
                colorId: {type:"f", value: colorIds[id] },
                scale: {type:"f", value: 1 },
                useGradient: {type:"f", value: 0 },
                threshold: {type:"f", value: 0.25 }
            },
            vertexShader: fileLoader.vs,
            fragmentShader: fileLoader.fs,
            transparent: true,
            // wireframe: true
        });
        materials.push( mat );

        var mesh = new THREE.Mesh(geom, mat );
        threebox.world.add(mesh);
        meshes.push( mesh );

        btn = document.createElement("input");
        container.appendChild(btn);
        btn.id = k;
        btn.type = "checkbox";
        btn.checked = true;
        btn.value = k;
        btn.mesh = mesh;
        var lab = document.createElement("label");
        lab.for = k;
        lab.innerText = k;
        lab.mesh = mesh;
        lab.btn = btn;
        container.appendChild(lab);
        btn.addEventListener("mousedown", function(e){
            e.target.mesh.visible = !e.target.mesh.visible;
        });
        lab.addEventListener("mousedown", function(e){
            e.target.mesh.visible = !e.target.mesh.visible;
            e.target.btn.checked = e.target.mesh.visible;
        });
        container.appendChild( document.createElement("br"));
        btns.push( btn );
        id++;

    }

    var settings = {
        wireframe:false,
        opacity:1,
        threshold:0.25,
        scale:1
    };

    function updateMaterialSettings(){
        materials.forEach(function( mat ){
            mat.wireframe = settings.wireframe;
            mat.uniforms.useGradient.value = settings.opacity;
            mat.uniforms.threshold.value = settings.threshold;
            mat.uniforms.scale.value = settings.scale;
        })
    }

    var gui = new dat.GUI();
    gui.add( settings, "wireframe" ).onChange(updateMaterialSettings)
    gui.add( settings, "opacity", 0,1,.1 ).onChange(updateMaterialSettings)
    gui.add( settings, "threshold", 0.01,1,.01 ).onChange(updateMaterialSettings)
    gui.add( settings, "scale", 0,10,.1 ).onChange(updateMaterialSettings)

    updateMaterialSettings();

}
