var show0017 = (function(){
    var PAGE_LOADED_BIT_INDEX = 0;
    var DEVICE_READY_BIT_INDEX = 1;


    var init = function(){
        document.addEventListener("deviceready", onReady, false);
        document.addEventListener("DOMContentLoaded", onPageLoaded, false);
        window.addEventListener("resize", onWindowResize, true);

        //add the listener for the back button
        window.addEventListener("popstate", siteNavigator.browserBackButton, false);
    }

    var onDeviceReady = function(){
        console.log("Device is ready");
        utilities.setBit(DEVICE_READY_BIT_INDEX);
        onReady();

    }

    var onPageLoaded = function(){
        console.log("Page is loaded");
        utilities.setBit(PAGE_LOADED_BIT_INDEX);
        /*TODO: remove the following line when you are testing on real device.*/
        siteNavigator.init();

        svgIcons.load();
        onReady();

    }

    var onReady = function(){
        if(utilities.isBitSet(DEVICE_READY_BIT_INDEX) &&
            utilities.isBitSet(PAGE_LOADED_BIT_INDEX)){
            siteNavigator.init();
            contacts.load();
            position.getCurrentLocation();
        }else{
            console.log("Both evenets has not been fired yet");
        }
    }

    var onWindowResize = function(){
        console.log("Window resize event has been fired");
    }

    return {
        init: init
    }
})();

var contacts = (function(){
    var numOfEntries=-1;
    var entries;
    var load = function(){

        var options      = new ContactFindOptions();
        options.filter   = ""; // A string can be used as a search filter when querying the contacts database
        options.multiple = true; // return multiple results.

        var fields       = [navigator.contacts.fieldType.displayName,
                            navigator.contacts.fieldType.phoneNumbers,
                            navigator.contacts.fieldType.addresses,
                            navigator.contacts.fieldType.photos];

        /* Asynchronously method to query the device contacts database.It returns an array of Contact objects.*/
        navigator.contacts.find(fields, onSuccess, onError, options);
    }

    var onSuccess = function(contacts){
        console.log("Found "+ contacts.length+ " on the phone");
        entries = contacts;
        numOfEntries = contacts.length;
    }

    var onError = function(contacts){
        console.error("Error:"+ contacts.code);
        numOfEntries = -1;
        entries = [];
    }

    var getEntries = function(){
        return entries;
    }

    var getAddresses = function(index){
        var addressess=[];
        if(entries[index]){
            var array = entries[index].addresses;
            for (var i=0; array && i< array.length; i++){
                addressess.push(array[i].formatted);
            }
        }
        return addressess;
    }

    var getEmails = function(index){
        var emails=[];
        if(entries[index]){
            var array = entries[index].emails;
            for (var i=0; array && i< array.length; i++){
                emails.push(array[i].value);
            }
        }
        return emails;
    }

    var getPhoneNumbers = function(index){
        var phones=[];
        if(entries[index]){
            var array = entries[index].phoneNumbers;
            for (var i=0; array && i< array.length; i++){
                phones.push(array[i].value);
            }
        }
        return phones;
    }

    return{
        load: load,
        getEntries: getEntries,
        getAddresses: getAddresses,
        getEmails: getEmails,
        getPhoneNumbers: getPhoneNumbers
    }
})();

var svgIcons = (function(){

    var load = function(){
        /* Load all svg images and set their tap event listeners. */
        var svgElementsArray = document.querySelectorAll("svg[data-icon-name]");
        for(var i=0; i<svgElementsArray.length; i++){
            var svgElement = svgElementsArray[i];

            /* Get a reference to the embedded svg tag in the HTML document using Snap SVG*/
            var snapCanvas = Snap( svgElement );

            /* SVG tag must have a custom data set whose value matches SVG file name */
            var iconNameDataSet = svgElement.getAttribute("data-icon-name");

            /* Load SVG group content into HTML doc through snap svg library.
            Note that JS Closure must have been used because load method is asynchronous
            and snap svg canvas must be locked to load the vector graphic inside svg
            element correctly.*/
            Snap.load( "svg/"+iconNameDataSet+".svg", (function (myCanvas) {
                return function(fragment){
                    var polygon = fragment.select( 'polygon' );
                    myCanvas.append( polygon );
                }
            })(snapCanvas));

        }
    }

    return{
        load: load
    }
})();

var position = (function (){


    var getCurrentLocation = function(){
      if( navigator.geolocation ){
          var params = {enableHighAccuracy: false, timeout:3600, maximumAge:60000};
          navigator.geolocation.getCurrentPosition( reportPosition, gpsError, params );
      }else{
        //browser does not support geolocation api
        alert("your browser does not support location based awesomeness.")
      }
    }


    var reportPosition = function ( position ){

            // position.coords.latitude
            // position.coords.longitude
            // 'key=AIzaSyCzGkfTYLGyBb9eM9bWgjlhmBdldBSBwNA';
    }

    var gpsError = function ( error ){
      var errors = {
        1: 'Permission denied',
        2: 'Position unavailable',
        3: 'Request timeout'
      };

      /* Hide the loading icon svg before showing user notification. */
      svgLoadingIcon.style.display="none";
      alert("Error: " + errors[error.code]);
    }

    var resetPositionDIVs= function(){

    }

    return{
        getCurrentLocation: getCurrentLocation,
        resetPositionDIVs: resetPositionDIVs
    }
})();

var siteNavigator = (function(){
    var pages = {};
    var numPages = 0;
    var currentPageId = null;

    var init = function(){
        var pagesArray = document.querySelectorAll('[data-role="page"]');
        numPages = pagesArray.length;


        /* save pages into js object where the key is the same as the given page id*/
        for(var i=0; i< numPages; i++){
            pages[pagesArray[i].getAttribute("id")] = pagesArray[i];
        }
        delete pagesArray; //Free the memory to increase performance.

        doPageTransition(null, "contacts");
    }

    //handle the click event
    var handleNav = function (ev){
        ev.preventDefault();

        /* Since the handlers of click/touch listeners are registered using bubbling
        propatation. Also the handlers are registered for acnhor tags not for SVG tags.
        Accordingly, currentTarget must be used instead of target to get href attribute
        of anchor tag.*/
        var href = ev.currentTarget.href;
        var destPageId = href.split("#")[1];
        var srcPageId = document.URL.split("#")[1];
        doPageTransition(srcPageId, destPageId, true);
        return false;
    }

    var loadDynamicContents = function(pageId){
        switch(pageId){
            case "contacts":
                /* Generate a random number from the available contacts to be displayed.
                Note that a random number will be generated in the range (0, maximum length of contacts -1)*/

                // if(contacts.getEntries()){

                // }
                break;
            case "location":

                break;
            default:
        }
    }

    var animatePage = function(pg){
        pg.classList.add("active-page");
    }

    var hidePage = function(pg){
        pg.className = "hide";
    }

    //Deal with history API and switching divs
    var doPageTransition = function( srcPageId, destPageId, isHistoryPush, isBackBtnPressed ){

        if(srcPageId == null){

            //home page first call
            pages[destPageId].classList.add("show");
            history.replaceState(null, null, "#"+destPageId);
            setTimeout(function(){
                window.scrollTo(0,0);
            },10);
        }else{

            /* Set active-page class to the corresponding page. First hide the current
            page, then show the destination page. Finally start animation while showing
            the destiation page.*/
            pages[srcPageId].className = "hide";
            pages[destPageId].className =  "show";

            loadDynamicContents(destPageId);

            /* It looks weired to set zero opacity after displaying the destination page. But
            this is normal because page flicking (during the animation of page transition) will take
            place if opacity was not set to zero. The class "show" is first added to the destination page
            afterwards, animation takes place starting from opacity zero. This is the root cause of
            flicking. To have smooth animation, we must set opacity to zero directly after displaying the
            destination page and before starting the animation.*/
            pages[destPageId].style.opacity = 0;

            /* Wait for 30 msec before applying the animation of page transition. This gives the
            browser time to update all the divs before applying the animation*/
            setTimeout(animatePage, 30, pages[destPageId]);

            if (isHistoryPush)
                history.pushState(null, null, "#" + destPageId);

            currentPageId = destPageId;
        }/* else srcPageId is not null*/
    }

    //Listener for the popstate event to handle the back button
    var browserBackButton = function (ev){
        ev.preventDefault();
        var destPageId = location.hash.split("#")[1];  //hash will include the "#"

        //update the visible div and the active tab
        doPageTransition(currentPageId, destPageId, false, true);
    }

    return {
        init : init,
        browserBackButton: browserBackButton
    }
})();

var utilities = (function(){
    var eventsMask = 0;
    var setBit = function(bitIndex){
        console.log("old value is:"+eventsMask);
        eventsMask |= (0x01<<bitIndex);
        console.log("new value is:"+eventsMask);
    }

    var isBitSet = function(bitIndex){
        console.log("actual value is:"+ eventsMask);
        return eventsMask &(0x01<<bitIndex);
    }

    return {
        setBit: setBit,
        isBitSet : isBitSet
    }
})();

show0017.init();
