var bitMap = function(n){
    var value = n;
    var setBit = function(bitIndex){
        console.log("old value is:"+value);
        value |= (0x01<<bitIndex);
        console.log("new value is:"+value);
    }

    var isBitSet = function(bitIndex){
        console.log("actual value is:"+ value);
        return value &(0x01<<bitIndex);
    }

    var reset = function(){
        value = 0;
    }

    return {
        reset: reset,
        setBit: setBit,
        isBitSet : isBitSet
    }
};

var show0017 = (function(){
    var PAGE_LOADED_BIT_INDEX = 0;
    var DEVICE_READY_BIT_INDEX = 1;
    /* This is a bit map that represents a bit for every events that is needed to be fired before
    using locations/contacts services in the device.
    There is a bit for DOMContentLoaded event and another bit for deviceready event.
    Create a new instance for bit map with value zero which means no events have been recieved yet. */
    var readyBitMap = new bitMap(0);

    var init = function(){
        document.addEventListener("deviceready", onDeviceReady, false);
        document.addEventListener("DOMContentLoaded", onPageLoaded, false);
        window.addEventListener("resize", onWindowResize, true);

        //add the listener for the back button
        window.addEventListener("popstate", siteNavigator.browserBackButton, false);
    }

    var onDeviceReady = function(){
        console.log("Device is ready");
        readyBitMap.setBit(DEVICE_READY_BIT_INDEX);
        onReady();

    }

    var onPageLoaded = function(){
        console.log("Page is loaded");
        readyBitMap.setBit(PAGE_LOADED_BIT_INDEX);

        /*TODO: remove the following line when you are testing on real device. */
        position.triggerRequest();
        /*TODO: remove the following line when you are testing on real device.*/
        siteNavigator.init();

        svgIcons.load();
        onReady();

    }

    var onReady = function(){
        if(readyBitMap.isBitSet(DEVICE_READY_BIT_INDEX) &&
            readyBitMap.isBitSet(PAGE_LOADED_BIT_INDEX)){

            siteNavigator.init();
            contacts.load();
            position.triggerRequest();
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

    var saveToLocalStorage = function (listOfContacts){
        console.error("saveToLocalStorage to be implemented");
    }

    return{
        load: load,
        getEntries: getEntries,
        getAddresses: getAddresses,
        getEmails: getEmails,
        getPhoneNumbers: getPhoneNumbers,
        saveToLocalStorage: saveToLocalStorage
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
                    var polygon = fragment.select( 'g' );
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

    var coordinates = {"lat":null, "lng":null};

    /*  In chrome, I found out that the timeout error code have been received even after getting
     *  position unavailable error code which violates what is stated in the Geolocation API:
     *
     *  "The timeout attribute denotes the maximum length of time (expressed in milliseconds) that is allowed to pass from
     *  the call to getCurrentPosition() or watchPosition() until the corresponding successCallback is invoked.
     *  If the implementation is unable to successfully acquire a new Position before the given timeout elapses,
     *  and no other errors have occurred in this interval, then the corresponding errorCallback must be
     *  invoked with a PositionError object whose code attribute is set to TIMEOUT."
     *
     *  As a workaround for this bug, an error bitMap is needed to check whether there is "POSITION_UNAVAILABLE"
     *  error has been received before "TIMEOUT" error or not.
     *  Note that I have tested the same code on Safari and it does not have this bug.
     */
    var errorsBitMap = new bitMap(0);

    var PERMISSION_DENIED_BIT_INDEX = 0;
    var POSITION_UNAVAILABLE_BIT_INDEX = 1;
    var TIMEOUT_BIT_INDEX = 2;

    var triggerRequest = function(){
      if( navigator.geolocation ){

          /* The maximumAge attribute indicates that the application is willing to accept a cached position whose age is no greater than the specified time in milliseconds*/
          var params = {enableHighAccuracy: true, timeout:3500, maximumAge:7000};
          navigator.geolocation.getCurrentPosition( reportPosition, gpsError, params );
      }else{
        //browser does not support geolocation api
        alert("your browser does not support location based awesomeness.")
      }
    }

    var reportPosition = function ( position ){
        coordinates.lat  = parseFloat(position.coords.latitude);
        coordinates.lng  = parseFloat(position.coords.longitude);
    }

    var gpsError = function ( error ){
      coordinates.lat  = null;
      coordinates.lng  = null;

      switch(error.code){
        case error.PERMISSION_DENIED:
            console.error("permission denied");
            errorsBitMap.setBit(PERMISSION_DENIED_BIT_INDEX);
            break;
        case error.POSITION_UNAVAILABLE:
            console.error("position unavailable");
            errorsBitMap.setBit(POSITION_UNAVAILABLE_BIT_INDEX);
            break;
        case error.TIMEOUT:
            console.error("position request timeout");
            errorsBitMap.setBit(TIMEOUT_BIT_INDEX);
            if(errorsBitMap.isBitSet(POSITION_UNAVAILABLE_BIT_INDEX)){
                /* clear bit map and return since warning gps modal window have been displayed before
                to the user upon receiving position unavailable error*/
                errorsBitMap.reset();
                return;
            }
      }

      /* display notification message to the user to make sure that GPS is turned on. */
      document.querySelector('#gps-modal-window').className = "show";
    }

    var getCurrentCoordinates = function(){
        return coordinates;
    }

    var isNull = function(){
        return ((null === coordinates.lat) && (null === coordinates.lng));
    }

    return{
        triggerRequest: triggerRequest,
        getCurrentCoordinates: getCurrentCoordinates,
        isNull : isNull
    }
})();

var siteNavigator = (function(){
    var pages = {};
    var numPages = 0;
    var currentPageId = null;
    var mapCanvas = null;

    var init = function(){

        var pagesArray = document.querySelectorAll('[data-role="page"]');
        numPages = pagesArray.length;


        /* save pages into js object where the key is the same as the given page id*/
        for(var i=0; i< numPages; i++){
            pages[pagesArray[i].getAttribute("id")] = pagesArray[i];
        }
        delete pagesArray; //Free the memory to increase performance.

        doPageTransition(null, "contacts");

        /* Add tap/double tap event listeners to list view of contacts. */
        var contactsListView = document.querySelector('ul[data-role="listview"]');

        /* Relate tap and double tap events to list view of contacts using hammer API */
        var contactListHammerManager = new Hammer.Manager(contactsListView);

        /* Create specifications for single tap and double tap events. */
        var doubleTapEvent = new Hammer.Tap({ event: 'doubletap', taps: 2 }) ;
        var singleTapEvent = new Hammer.Tap({ event: 'singletap', domEvents:true });

        /* Add single/double tap events to hammer manager.*/
        contactListHammerManager.add( doubleTapEvent );
        contactListHammerManager.add( singleTapEvent);

        /* we want to recognize single/double tap simulatenously. Otherwise single tap handler will be always triggered during double tap event.
        So a double tap will be detected even a single tap has been recognized.*/
        doubleTapEvent.recognizeWith('singletap');

        /* we only want to trigger a tap, when we don't have detected a doubletap. */
        singleTapEvent.requireFailure('doubletap');

        /* register handler for single/double tap events. */
        contactListHammerManager.on("doubletap", handleContactDoubleTap );
        contactListHammerManager.on("singletap", handleContactSingleTap);

        var cancelBtnHammerManager = new Hammer( document.getElementById("btnCancel"));
        cancelBtnHammerManager.on('tap', handleCancelTap);

        var okBtnHammerManager = new Hammer( document.getElementById("btnOk"));
        okBtnHammerManager.on('tap', handleOkTap);

        var cancelBtnGPSHammerManager = new Hammer( document.getElementById("btnCancelGPS"));
        cancelBtnGPSHammerManager.on('tap', handleCancelTapForGPS);

        var settingsBtnGPSHammerManager = new Hammer( document.getElementById("btnSettingsGPS"));
        settingsBtnGPSHammerManager.on('tap', handleSettingsTapForGPS);

        /* Wait until the trigger of current location request is timed-out.
        TODO: handle error case by showing a warning message to the user to open his GPS
        and try again */
        setTimeout(loadMap, 3600);
    }

    var loadMap = function (){
        console.log("Map is loading");
        if(position.isNull()){
            console.log("position is null");
            var mapOptions = {
                               center: {lat:0, lng:0},
                               zoom:3
                             };
        }else{
            /* Make sure to hide the toast failure message in case user double-tapped an item
            before triggering the map loading. */
            document.querySelector(".toast").style.opacity = 0;
            var mapOptions = {
                              center: position.getCurrentCoordinates(),
                              zoom: 15
                             };

        }

        mapCanvas = new google.maps.Map(document.getElementById('map-canvas'),
            mapOptions);
    }

    var handleSettingsTapForGPS = function(ev){
        document.querySelector('#gps-modal-window').className = "hide";
        /* TODO: Show Device settings app.*/
    }

    var handleCancelTapForGPS = function(ev){
        document.querySelector('#gps-modal-window').className = "hide";
    }

    var handleCancelTap = handleOkTap = function(ev){
        document.querySelector('#contacts-modal-window').className = "hide";
    }

    var handleContactDoubleTap = function(ev){
        console.log("Double tap event has been recognized");
        /* transition to the dynamic map screen. Using the fetched current gps position as the center of the map clear any markers that are currently on the map.*/
        doPageTransition("contacts","location", true, false);

        if(position.isNull()){
            /* User might double-tapped an item list before triggering loadMap method. Make sure to reset
            opacity to zero if the postion cooradinates have been obtained successfully afterwards.*/
            console.log("sitting opacity of toast message to 1");
            document.querySelector(".toast").style.opacity = 1;
        }else{
            console.log("toast message will not be displayed");
        }

        /*  since location section was hidden while loading the map, div dimensions were zero,
            trigger resize event so that map tiles are rendered properly after showing the location section.*/
        google.maps.event.trigger(mapCanvas, 'resize');
        // mapCanvas.setZoom(mapCanvas.getZoom());

        /*clear any markers on the map. */
    }

    var handleContactSingleTap = function(ev){
        console.log("Single tap event has been recognized");

        /* display modal window that will display the contact's name as well as all phone numbers for that contact. */

        /* Get which list item have been tapped. Since hammer.js does not have currentTarget property, a backward
         * navigation must be done. */
         var currentTarget = ev.target;
         var contactId = currentTarget.getAttribute("data-ref");
         while(null === contactId){
            currentTarget = currentTarget.parentNode;
            contactId     = currentTarget.getAttribute("data-ref");
            console.log(currentTarget);
         }

         /* Make sure that we find a valid contanct list item */
         if(contactId){
            /* TODO: Get all information stored in local storage. */
         }

         document.querySelector('#contacts-modal-window').className = "show";

    }

    //handle the click event
    // var handleNav = function (ev){
    //     ev.preventDefault();

    //     //  Since the handlers of click/touch listeners are registered using bubbling
    //     // propatation. Also the handlers are registered for acnhor tags not for SVG tags.
    //     // Accordingly, currentTarget must be used instead of target to get href attribute
    //     // of anchor tag.
    //     var href = ev.currentTarget.href;
    //     var destPageId = href.split("#")[1];
    //     var srcPageId = document.URL.split("#")[1];
    //     doPageTransition(srcPageId, destPageId, true);
    //     return false;
    // }

    var loadDynamicContents = function(pageId){
        switch(pageId){
            case "contacts":
                /* Generate a random number from the available contacts to be displayed.
                Note that a random number will be generated in the range (0, maximum length of contacts -1)*/

                // if(contacts.getEntries()){

                // }

                /* TODO: Save displayed contacts to local storage. */
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
        }else{

            /* Set active-page class to the corresponding page. First hide the current
            page, then show the destination page. Finally start animation while showing
            the destiation page.*/
            pages[srcPageId].classList.remove("show");
            pages[destPageId].classList.add("show");

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

        /* after loading any page, make sure to scroll to the top of this page. */
        window.scrollTo(0,0);

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

show0017.init();
