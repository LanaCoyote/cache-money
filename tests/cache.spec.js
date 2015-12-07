// cache tests

var expect = chai.expect;

function safeSpyOn( obj, fn ) {
  var oldts = obj[fn].toString.bind( obj[fn] );
  chai.spy.on( obj, fn );
  obj[fn].toString = oldts;
}

describe('Cache object', function() {

  describe('anonymous syntax', function() {

    var cache,fn = {
        addTwo : function( n ) { return n + 2; },
        mulThree : function( n ) { return n * 3; },
        concat : function( s1, s2 ) { return s1.toString() + s2.toString(); },
        sum : function() { 
          var sm = 0;
          for ( var a in arguments ) sm += arguments[a];
          return sm;
        },
      };
    beforeEach(function() {

      // the anonymous syntax takes either no arguments or a config object when
      // initialized.
      cache = Cache$();

    });

    beforeEach(function() {

      safeSpyOn( fn, 'addTwo' );
      safeSpyOn( fn, 'mulThree' );
      safeSpyOn( fn, 'concat' );
      safeSpyOn( fn, 'sum' );

    });

    it( 'is a function', function() {

      expect( typeof cache ).to.be.equal( 'function' );

    });

    it( 'has a ._calls property', function() {

      expect( cache ).to.have.property( '_calls' );

    });

    it( 'can be called with a function and returns a LocalCache', function() {

      var fnCall = cache( fn.addTwo );
      expect( fnCall.__proto__ ).to.be.equal( LocalCache.prototype );
      expect( fnCall ).to.have.property( 'call' );
      expect( fnCall ).to.have.property( 'apply' );

    });

    it( 'can call the function directly', function() {

      expect( cache( fn.addTwo )( 2 ) ).to.be.equal( 4, "direct call did not return the right value" );
      expect( fn.addTwo ).to.have.been.called();
      expect( fn.addTwo ).to.have.been.called.with( 2 );

    });

    it( 'can call the function using .call', function() {

      expect( cache( fn.addTwo ).call( 2 ) ).to.be.equal( 4, ".call did not return the right value" );
      expect( fn.addTwo ).to.have.been.called();
      expect( fn.addTwo ).to.have.been.called.with( 2 );

    });

    it( 'can call the function using .apply', function() {

      expect( cache( fn.addTwo ).apply( [2] ) ).to.be.equal( 4, ".apply did not return the right value" );
      expect( fn.addTwo ).to.have.been.called();
      expect( fn.addTwo ).to.have.been.called.with( 2 ); 

    });

    it( 'stores the result of a call with the same arguments', function() {

      var fnCall = cache( fn.addTwo );
      fnCall.call( 2 );
      expect( fnCall.call( 2 ) ).to.be.equal( 4, ".call did not return the right value" );
      expect( fn.addTwo ).to.have.been.called.exactly( 1, "function was called more than once" );

    });

    it( 'stores the result of a call with the same arguments with different LocalCaches', function() {

      cache( fn.addTwo ).call( 2 );
      expect( cache( fn.addTwo ).call( 2 ) ).to.be.equal( 4, ".call did not return the right value" );
      expect( fn.addTwo ).to.have.been.called.exactly( 1, "function was called more than once" );

    });

    it( 'stores the results of two different calls', function() {

      cache( fn.addTwo ).call( 2 );
      cache( fn.addTwo ).call( 10 );
      expect( cache( fn.addTwo ).call( 2 ) ).to.be.equal( 4 );
      expect( cache( fn.addTwo ).call( 10 ) ).to.be.equal( 12 );
      expect( fn.addTwo ).to.have.been.called.exactly( 2 );

    });

    it( 'stores the results of two different functions', function() {

      cache( fn.addTwo ).call( 2 );
      cache( fn.mulThree ).call( 2 );
      expect( cache( fn.addTwo ).call( 2 ) ).to.be.equal( 4 );
      expect( cache( fn.mulThree ).call( 2 ) ).to.be.equal( 6 );
      expect( fn.addTwo ).to.have.been.called.exactly( 1 );
      expect( fn.mulThree ).to.have.been.called.exactly( 1 );

    });

    it( 'properly stores the results of a function with multiple args', function() {

      var concache = cache( fn.concat );

      expect( concache.call( "Hello,", " world!" ) ).to.be.equal( "Hello, world!" );
      expect( concache.call( "Hello,", " world!" ) ).to.be.equal( "Hello, world!" );
      expect( fn.concat ).to.have.been.called.exactly( 1 );

      expect( concache.call( "Goodbye,", " world!" ) ).to.be.equal( "Goodbye, world!" );
      expect( concache.call( "Goodbye,", " world!" ) ).to.be.equal( "Goodbye, world!" );
      expect( fn.concat ).to.have.been.called.exactly( 2 );

      expect( concache.call( "One", "Two" ) ).to.be.equal( "OneTwo" );
      expect( concache.call( "Two", "One" ) ).to.be.equal( "TwoOne" );
      expect( concache.call( "Two", "Three" ) ).to.be.equal( "TwoThree" );
      expect( fn.concat ).to.have.been.called.exactly( 5 );

      expect( concache.call( "One", "Two" ) ).to.be.equal( "OneTwo" );
      expect( fn.concat ).to.have.been.called.exactly( 5 );

    });

    it( 'properly stores the results of a function with any number of args', function() {

      var sumcache = cache( fn.sum );

      expect( sumcache.call( 1, 2, 3 ) ).to.be.equal( 6 );
      expect( sumcache.call( 1, 2, 3 ) ).to.be.equal( 6 );
      expect( fn.sum ).to.have.been.called.exactly( 1 );

      expect( sumcache.call( 1, 2, 3 ) ).to.be.equal( 6 );
      expect( sumcache.call( 1, 2, 3, 4 ) ).to.be.equal( 10 );
      expect( sumcache.call( 1, 2 ) ).to.be.equal( 3 );
      expect( fn.sum ).to.have.been.called.exactly( 3 );

      expect( sumcache.call() ).to.be.equal( 0 );
      expect( sumcache.call() ).to.be.equal( 0 );
      expect( fn.sum ).to.have.been.called.exactly( 4 ); 

    });

    it( 'evaluates arguments before checking the cache', function() {

      var atwocache = cache( fn.addTwo );

      expect( atwocache.call( fn.sum( 1, 2 ) ) ).to.be.equal( 5 );
      expect( atwocache.call( fn.mulThree( 1 ) ) ).to.be.equal( 5 );
      expect( atwocache.call( 3 ) ).to.be.equal( 5 );
      expect( fn.addTwo ).to.have.been.called.exactly( 1 );

    });

  });


  describe( 'bound syntax', function() {

    var cache,fn = {
        addTwo : function( n ) { return n + 2; },
        mulThree : function( n ) { return n * 3; },
        concat : function( s1, s2 ) { return s1.toString() + s2.toString(); },
        sum : function() { 
          var sm = 0;
          for ( var a in arguments ) sm += arguments[a];
          return sm;
        },
      };
    beforeEach(function() {

      safeSpyOn( fn, 'addTwo' );
      safeSpyOn( fn, 'mulThree' );
      safeSpyOn( fn, 'concat' );
      safeSpyOn( fn, 'sum' );

    });

    it( 'can bind to a function and returns a LocalCache object', function() {

      cache = Cache$( fn.addTwo );

      expect( cache.constructor ).to.be.equal( LocalCache );
      expect( cache.fn ).to.be.equal( fn.addTwo );

    });

    it( 'can call the bound function directly', function() {

      cache = Cache$( fn.addTwo );
      expect( cache( 2 ) ).to.be.equal( 4 );

    });

    it( 'can call the bound function using .call()', function() {

      cache = Cache$( fn.addTwo );
      expect( cache.call( 2 ) ).to.be.equal( 4 );

      cache = Cache$( fn.concat );
      expect( cache.call( "Hello,", " world!" ) ).to.be.equal( "Hello, world!" );

    });

    it( 'can call the bound function using .apply()', function() {

      cache = Cache$( fn.addTwo );
      expect( cache.apply( [2] ) ).to.be.equal( 4 );

      cache = Cache$( fn.concat );
      expect( cache.apply( ["Hello,", " world!" ] ) ).to.be.equal( "Hello, world!" );

    });

    describe( 'properly caches results', function() {

      it( 'when calling a function with 1 argument', function() {

        cache = Cache$( fn.addTwo );
        expect( cache( 2 ) ).to.be.equal( 4 );
        expect( cache( 2 ) ).to.be.equal( 4 );
        expect( fn.addTwo ).to.have.been.called.exactly( 1 );

        expect( cache( 10 ) ).to.be.equal( 12, "didn't return the right value with new arguments" );
        expect( cache( 2 ) ).to.be.equal( 4 );
        expect( cache( 10 ) ).to.be.equal( 12 );
        expect( cache( 8 ) ).to.be.equal( 10 );
        expect( fn.addTwo ).to.have.been.called.exactly( 3 );

        var otherCache = Cache$( fn.mulThree );
        expect( otherCache( 3 ) ).to.be.equal( 9 );
        expect( cache( 3 ) ).to.be.equal( 5 );
        expect( otherCache( 3 ) ).to.be.equal( 9 );
        expect( fn.addTwo ).to.have.been.called.exactly( 4 );
        expect( fn.mulThree ).to.have.been.called.exactly( 1 );

      });

    });

  });


  describe( 'stress test #1', function() {

    var fn = {
      addTwo: function( n ) { return n + 2; }
    };
    beforeEach( function() {

      safeSpyOn( fn, 'addTwo' );

    });

    it( 'only calls a function once if it has a result already', function() {

      var cache = Cache$( fn.addTwo );

      for( var i = 0; i < 100; ++i ) {
        expect( cache.call( 2 ) ).to.be.equal( 4 );
      }

      expect( fn.addTwo ).to.have.been.called.exactly( 1 );

    });

    it( 'calls a function once for each argument passed into it', function() {

      var cache = Cache$( fn.addTwo );

      for ( var i = 0; i < 100; ++i ) {
        expect( cache.call( i ) ).to.be.equal( i + 2 ); 
      }

      expect( fn.addTwo ).to.have.been.called.exactly( i );

    });

    it( 'works as expected with random inputs', function() {

      var cache = Cache$( fn.addTwo );
      var args = [];

      for ( var i = 0; i < 2000; ++i ) {
        var rand = Math.round( Math.random() * 100 );
        if ( args.indexOf( rand ) === -1 ) args.push( rand );
        cache.call( rand );
      }

      expect( fn.addTwo ).to.have.been.called.exactly( args.length );

    });

  });

  
  describe( 'Extended Functionality', function() {

    var cache,fn = {
        addTwo : function( n ) { return n + 2; },
        mulThree : function( n ) { return n * 3; },
        concat : function( s1, s2 ) { return s1.toString() + s2.toString(); },
        sum : function() { 
          var sm = 0;
          for ( var a in arguments ) sm += arguments[a];
          return sm;
        },
      };
    beforeEach( function() {

      safeSpyOn( fn, 'addTwo' );
      safeSpyOn( fn, 'mulThree' );
      safeSpyOn( fn, 'concat' );
      safeSpyOn( fn, 'sum' );

    });

    it( 'can take a timeout parameter', function() {

      cache = Cache$( { timeout: 10000 } );
      expect( cache ).to.have.property( 'timeout' );
      expect( cache.timeout ).to.be.equal( 10000 );

    });

    it( 'only stores data for the duration of its timeout', function( done ) {

      cache = Cache$( { timeout: 500 } );
      
      cache( fn.addTwo ).call( 10 );
      cache( fn.addTwo ).call( 10 );
      expect( fn.addTwo ).to.have.been.called.exactly( 1 );

      setTimeout( function() {

        expect( cache( fn.addTwo ).call( 10 ) ).to.be.equal( 12 );
        expect( fn.addTwo ).to.have.been.called.exactly( 2 );

        expect( cache( fn.addTwo ).call( 10 ) ).to.be.equal( 12 );
        expect( fn.addTwo ).to.have.been.called.exactly( 2 );

        done();

      }, 1000 );

    });

  });

});