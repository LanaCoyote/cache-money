// cache.js
// Last modified: December 4, 2015 by David Reeve

// helper functions

// FUNCTION: hashArgsList
// takes an argument list and returns a hash of it for retrieving duplicate
// results from the same function.
//
// param: argsList - the argument list to hash
//
// returns: a hash of argsList
function hashArgsList( argsList ) {

  return argsList.toString();

}


// FUNCTION: hashFnDef
// takes a function and hashes its definition (toString). for retrieving duplicate
// calls of the same function.
//
// param: fn - the function to hash the defintion of
//
// returns: a hash of the function's definition
function hashFnDef( fn ) {

  return fn.toString(); // todo: actually hash this

}


// FUNCTION: getFnCalls
// gets the LocalCache object of a particular function from an Anonymous Cache.
// returns null if no LocalCache was found.
// 
// param: cache - the anonymous cache function to search in
// param: fn - the function to search for a cache of
//
// returns: a LocalCache associated with the given function
function getFnCalls( cache, fn ) {

  var fnHash = hashFnDef( fn );
  return cache._calls[fnHash] || null;

}


// FUNCTION: Cache$
// creates either a LocalCache object or an anonymous cache with the given config
// object. if no function is given (either a config object or no arguments), the
// cache is considered "anonymous" and must be called with a function in order to
// retrieve a usable cache.
//
// param: configOrFunction - either a function or config object. if it's a function,
//                           Cache$ returns a LocalCache object bound to it. if not,
//                           it returns an anonymous cache function.
// param: declConfig - declarative config object. configures the way the cache
//                     works, including timeouts and files to save to.
//
// returns: a LocalCache object of the given function or an "anonymous" cache
//          function that can be bound to a function.
function Cache$( configOrFunction, declConfig ) {

  var cache = null;

  if ( configOrFunction === undefined ) configOrFunction = {};

  if ( typeof configOrFunction === 'function' ) {

    // declarative syntax
    var timeout = declConfig ? declConfig.timeout : undefined;
    return new LocalCache( configOrFunction, {}, timeout );

  } else {

    // anonymous syntax
    cache = function( fn ) {

      // if we have an existing cache for this function, we'll use it in the
      // LocalCache that we create. Otherwise we'll initialize a new cache.
      var initCalls = getFnCalls( cache, fn );
      if ( initCalls === null ) {

        cache._calls[hashFnDef( fn )] = {};
        initCalls = getFnCalls( cache, fn );

      }

      // if we have a timeout we'll set it, otherwise -1
      var timeout = -1;
      if ( cache.timeout !== undefined ) {
        timeout = cache.timeout;
      }

      // create a new LocalCache
      return new LocalCache( fn, initCalls, timeout );

    }

    // set some properties of the cache function
    cache._fn = null;
    cache._calls = {};
    cache.timeout = configOrFunction.timeout;

  }

  // last resort error checking
  if ( cache === null )
    throw new Error( "an unknown error caused cache initialization to return null" );

  return cache;

}


// CONSTRUCTOR: CachedData
// stores cached data that can then be retrieved from it. also keeps track of the time
// it was stored and can be checked with the expired() method.
//
// param: data - the data value of this CachedData
function CachedData( data ) {

  this.data = data;
  this.timeStored = Date.now();

}


// METHOD: CachedData.prototype.expired
// determines whether a CachedData object has exceeded its timeout limit. if it has
// timed out, the data should not be retrieved and can be overwritten.
//
// param: timeout - the timeout to compare the time stored against
//
// returns: true if more than <timeout> ms have passed since this data was stored.
//          if timeout is -1, returns false. (timeout -1 is a synonym for no timeout)
CachedData.prototype.expired = function( timeout ) {

  if ( timeout < 0 ) return false;
  return Date.now() - this.timeStored > timeout;

}


// METHOD: CachedData.prototype.get
// gets the data value stored on this CachedData object.
//
// returns: the data that was assigned to this CachedData object when it was initialized.
CachedData.prototype.get = function() {

  return this.data;

}


// CONSTRUCTOR: LocalCache
// stores a cache of results based on inputs for a given function. if the function is
// called multiple times with the same input, it will return the same result (assuming its
// timeout has not expired)
//
// param: fn - the function to bind to this LocalCache
// param: initCalls [OPTIONAL] - the initial state of this LocalCache's .calls object
// param: timeout [OPTIONAL] - how long until results retrieved from calling the bound
//                             function are invalidated (in ms)
function LocalCache( fn, initCalls, timeout ) {

  this.fn = fn;
  this.calls = initCalls || {};
  this.timeout = timeout || -1;
  this._this = null;
  this.forceNext = false;

}


// METHOD: LocalCache.prototype.this
// chaining (or not) function that sets the this property of the bound function when
// called.
//
// param: _this - the object to bind to the LocalCache's this property
//
// returns: this (the LocalCache, not the _this param)
LocalCache.prototype.this = function( _this ) {

  this._this = _this;
  return this;

}


// METHOD: LocalCache.prototype.force
// chaining function that requires the next call of .apply() to execute the function
// again.
//
// returns: this
LocalCache.prototype.force = function() {

  this.forceNext = true;

}


// METHOD: LocalCache.prototype.apply
// applies the given argsList to the bound function and returns either the result of
// calling the function or the previous result if there was an earlier execution with
// the same argsList.
//
// param: argsList - the arguments to call the bound function with
// param: force [OPTIONAL] - forces a the bound function to be called again, even if
//                           it has been called with these arguments before
//
// returns: the results of calling the function, or the results of a previous call if
//          the arguments have been applied before (within the LocalCache's timeout)
LocalCache.prototype.apply = function( argsList, force ) {

  // if forceNext has been forced, force force to be forceful, then force forceNext
  // to be false
  if ( this.forceNext ) {

    force = true;
    this.forceNext = false;

  }

  // check the cache for a call with these arguments
  if ( !force ) {

    var cdata = this.calls[hashArgsList( argsList )];
    if ( cdata !== undefined && !cdata.expired( this.timeout ) ) {
      return cdata.get();
    }

  }

  // no cached result found, call the function!
  var result = this.fn.apply( this._this, argsList );
  this.calls[hashArgsList( argsList )] = new CachedData( result );
  return result;

}


// METHOD: LocalCache.prototype.call
// calls the bound method with the given arguments. this just calls .apply() with an
// array of the arguments passed in.
//
// param: ... - the arguments to call the bound function with
//
// returns: the results of calling the function, or the results of a previous call if
//          the arguments have been called before (within the LocalCache's timeout)
LocalCache.prototype.call = function() {

  // according to the MDN, slicing an arguments array is less efficient than
  // constructing a new array from its contents.
  var argsList = [];
  for ( var idx in arguments ) {
    argsList.push( arguments[idx] );
  }

  return this.apply( argsList );

}


LocalCache.prototype.toString = function() {

  var outString = "{LocalCache of " + this.fn.toString() + ", previous calls:{\n";
  for ( var call in this.calls ) {
    outString += "\t(" + call + ") => " + this.calls[call].get() + ",\n";
  }
  outString = outString.slice( -1 );
  return outString + "}}";

}



module.exports = Cache$;