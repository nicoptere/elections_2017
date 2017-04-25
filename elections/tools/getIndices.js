

// rettrieve the indices
var rawIndices = fileLoader.indices.split( ',' ).map( function(v){return parseInt( v ); });
var contours = getContour();
var indices = [];
for( var i = 0; i < rawIndices.length; i+= 3 ){


    //center of the triangle
    var t = [rawIndices[i], rawIndices[i+1], rawIndices[i+2]];
    var x = ( coords[ t[0] ][0] + coords[ t[1] ][0] + coords[ t[2] ][0] ) / 3;
    var y = ( coords[ t[0] ][1] + coords[ t[1] ][1] + coords[ t[2] ][1] ) / 3;

    //we keep the face only if it is contained inside the polygon

    var valid = false;
    contours.forEach( function( contour ){

        if( valid )return;
        if( contains( contour, x,y ) ){
            valid = true;
        }
    });
    if( valid ) indices.push( t[0],t[1],t[2]);

}
document.write( indices );
function getContour(){

    var json = JSON.parse( fileLoader.france );
    var tmp = [];

    console.log( json.features );
    json.features.forEach(function( item ){
        item.geometry.coordinates.forEach( function( coords ){

            var poly = [];
            coords.forEach( function( p ){
                poly.push( p );
            });
            poly[0].pop();
            tmp.push( poly[0] );
        });
    });
    return tmp;
}

function contains( poly, x, y )
{
    var c = false,
        l = poly.length,
        j = l - 1;
    for( var i = -1; ++i < l; j = i)
    {
        (   ( poly[ i ][1] <= y && y < poly[ j ][1] )
        ||  ( poly[ j ][1] <= y && y < poly[ i ][1] ) )
        &&  ( x < ( poly[ j ][0] - poly[ i ][0] ) * ( y - poly[ i ][1] ) / ( poly[ j ][1] - poly[ i ][1] ) + poly[ i ][0] )
        &&  ( c = !c);
    }
    return c;
}
