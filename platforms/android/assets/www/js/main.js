var appClass = function(){
    var PAGE_LOADED_BIT_INDEX = 0;
    var DEVICE_READY_BIT_INDEX = 1;
    var MAXIMUM_NUMBER_OF_DISPLAYED_CONTACTS = 12;

    var bitMapClass = function(n){
        var value = n;
        var setBit = function(bitIndex){
            value |= (0x01<<bitIndex);
        }

        var isBitSet = function(bitIndex){
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

    var storageClass = function(){
        var information=[];

        var isValidKey = function(key){
            var availableKeys = ['id','name','phoneNumbers','emails','addressess','latLng'];
            return (-1 !== availableKeys.indexOf(key));
        };

        var updateData = function(userId, data){
            if( (MAXIMUM_NUMBER_OF_DISPLAYED_CONTACTS> userId) &&
                ("object" === typeof data)){
                    for(var key in data){
                    /* validate key.*/
                    if(isValidKey(key)){
                        information[userId][key] = data[key];
                    }
                }

                if('localStorage' in window){
                    localStorage.setItem("contactsInfo", JSON.stringify(information));
                }
            }
        }

        var getData = function(userId, key){
            var value = null;

            if('localStorage' in window){
                information = JSON.parse(localStorage.getItem("contactsInfo"));
                if(null === information){
                    information = [];
                }
            }

            if( (MAXIMUM_NUMBER_OF_DISPLAYED_CONTACTS > userId) &&
                (information.length > userId) &&
                (isValidKey(key)) ){
                    value = information[userId][key];
            }

            return value;
        };

        var saveData = function(userId, data){
            data.id = userId;
            if( (MAXIMUM_NUMBER_OF_DISPLAYED_CONTACTS> userId) &&
                ("object" === typeof data)){
                var finalObject = {};
                for(var key in data){
                    /* validate key.*/
                    if(isValidKey(key)){
                        finalObject[key] = data[key];
                    }
                }
                information.push(finalObject);
            }

            if('localStorage' in window){
                localStorage.setItem("contactsInfo", JSON.stringify(information));
            }
        };

        return{
            getData: getData,
            saveData: saveData,
            updateData: updateData
        }
    };

    var mapDriverClass = function (){
        var map;
        var markers = [];

        var loadMap = function (){
            console.log("Map is loading");

        var styles = [
                        {
                          featureType: "water",
                          stylers: [
                                        { color: "#00EEFF" },
                                        { saturation: -24}
                                    ]
                        }
                      ];


        if(position.isNull()){
            console.log("position is null");
            var mapOptions = {
                               center: {lat:0, lng:0},
                               zoom:3,
                               disableDoubleClickZoom: true
                             };
        }else{
            /* Make sure to hide the toast failure message in case user double-tapped an item
            before triggering the map loading. */
            document.querySelector(".toast").style.opacity = 0;
            var mapOptions = {
                               center: position.getCurrentCoordinates(),
                               zoom: 15,
                               disableDoubleClickZoom: true
                             };

        }

        map =  new google.maps.Map(document.getElementById('map-canvas'),
                    mapOptions);
        map.setOptions({styles: styles});
        };

        var resize = function(){
            google.maps.event.trigger(map, 'resize');
            // mapCanvas.setZoom(mapCanvas.getZoom());
        }

        var registerEvent = function (eventType, callback,object){
            if(!object){
                object = map;
            }
            /* To save memory, register the event only once. */
            google.maps.event.addListenerOnce(object, eventType, callback);
        }

        var addNewMarker =  function(event){
            var marker = new google.maps.Marker({
                position: event.latLng,
                draggable:true,
                animation: google.maps.Animation.BOUNCE,
                icon: { fillColor:"red",
                        fillOpacity: 1,
                        path:"M45.1,45.9H2.9c2-7.6,6.5-11.2,12.2-12.7c2.6,1.4,5.6,2.2,8.8,2.2c3.2,0,6.2-0.8,8.8-2.2C38.5,34.8,43,38.3,45.1,45.9z M38.7,16.7c0,8.1-6.6,14.7-14.7,14.7c-8.1,0-14.7-6.6-14.7-14.7C9.3,8.6,15.9,2.1,24,2.1C32.1,2.1,38.7,8.6,38.7,16.7z M35.2,21.1 H14.3c2.2,4.3,6.1,7.2,10.5,7.2C29.1,28.3,32.9,25.5,35.2,21.1z"
                      },
                map: map
              });

            /* get current user id */
            var userId = siteNavigator.getCurrerntUserId();

            if("function" === typeof event.latLng.lat){
                var object = { "lat": event.latLng.lat(),
                                "lng":event.latLng.lng()};
            }else{
                var object = {"lat": event.latLng.lat, "lng":event.latLng.lng};
            }

            /* save coordinates to local storage. */
            storage.updateData(userId, {"latLng":object});

            markers.splice(userId,0,marker);
            /* add listener to the event of dragging the marker. */
            var markerDragHandler = google.maps.event.addListener(marker, "drag", function(event){

                if("function" === typeof event.latLng.lat){
                    var object = { "lat": event.latLng.lat(),
                                    "lng":event.latLng.lng()};
                }else{
                    var object = {"lat": event.latLng.lat, "lng":event.latLng.lng};
                }

                /* save coordinates to local storage. */
                storage.updateData(userId, {"latLng":object});
                markers[userId].position = event.latLng;
            });

            var contentString = '<div id="info-window"><p>Contact name: '+
                                    storage.getData(userId, "name")+
                                    '</p></div>';
            console.log(contentString);
            var infowindow = new google.maps.InfoWindow({content: contentString});
            google.maps.event.addListener(marker, 'click', function() {
                                    infowindow.open(map,marker);
                                  });

            setTimeout(function(){
                marker.setAnimation(null);
                // infowindow.open(map,marker);
            }, 3000);

        }

        var loadSavedMarker = function(latLng){
            var object = {"latLng": latLng};
            /* add the marker to the map */
            addNewMarker(object);
        }

        var clearMarkers = function(){
            for(var i=0; i< markers.length; i++){
                markers[i].setMap(null);
                markers[i] = null;
            }
            markers = [];
        }

        var changeCenter = function(latLng){
            map.setCenter(latLng);
        }

        return{
            loadMap: loadMap,
            resize: resize,
            registerEvent: registerEvent,
            addNewMarker: addNewMarker,
            loadSavedMarker: loadSavedMarker,
            changeCenter: changeCenter,
            clearMarkers: clearMarkers
        }
    };

    var geolocationClass = function (){

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
        var errorsBitMap = new bitMapClass(0);

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
    };

    var siteNavigatorClass = function(){
        var pages = {};
        var numPages = 0;
        var currentPageId = null;
        var mapCanvas = null;
        var currentUserId = -1;

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

            okBtnHammerManager = new Hammer(document.getElementById("btnOkUserLoc"));
            okBtnHammerManager.on('tap', handleOkTap);

            var backBtnHammerManager = new Hammer(document.querySelector('svg[data-icon-name="back"]'));
            backBtnHammerManager.on('tap', handleBackButton);

            /* Wait until the trigger of current location request is timed-out.
            handle error case by showing a warning message to the user to open his GPS */
            setTimeout(mapDriver.loadMap, 3600);
        }

        var handleSettingsTapForGPS = function(ev){
            document.querySelector('#gps-modal-window').className = "hide";
            /* TODO: Show Device settings app.*/
        }

        var handleCancelTapForGPS = function(ev){
            document.querySelector('#gps-modal-window').className = "hide";
        }

        var handleCancelTap = handleOkTap = function(ev){
            if('btnOkUserLoc' === ev.target.getAttribute("id")){
                document.querySelector('#user-loc-modal-window').className = "hide";
            }else{
                document.querySelector('#contacts-modal-window').className = "hide";
            }

        }

        var handleContactDoubleTap = function(ev){
            console.log("Double tap event has been recognized");

            /* Get which list item have been tapped. Since hammer.js does not have currentTarget property, a bubbling
             * navigation must be done toward the parent element(s) to find out which contact has been double-tapped */
             // var timeStamp1 = Date.now();
             var currentTarget = ev.target;
             var contactId = currentTarget.getAttribute("data-ref");
             while(null === contactId){
                currentTarget = currentTarget.parentNode;
                contactId     = currentTarget.getAttribute("data-ref");
             }

             /* Make sure that we find a valid contanct list item */
             if(contactId){
                currentUserId = contactId;

                /* Get the location information stored in local storage (if any) using the contact id. */
                var latLng = storage.getData(currentUserId, "latLng");

                /* clear any markers on the map. */
                mapDriver.clearMarkers();

                /* transition to the dynamic map screen. Using the fetched current gps position as the center of the map clear any markers that are currently on the map.*/
                doPageTransition("contacts","location", true);

                /*  since location section was hidden while loading the map, div dimensions were zero,
                    trigger resize event so that map tiles are rendered properly after showing the location section.*/
                mapDriver.resize();

                /* Check the localStorage data to see if the selected user has a latitude and longitude.*/
                if(latLng){
                    /*If the user has a saved cooardinates in local storage, add an animated marker to the map.*/
                    mapDriver.loadSavedMarker(latLng);
                    mapDriver.changeCenter(latLng);

                }else{ /* case user does NOT have a stored cooardinates in local storage. */

                    if(position.isNull()){
                        /* User might double-tapped an item list before triggering loadMap method. Make sure to reset
                        opacity to zero if the postion cooradinates have been obtained successfully afterwards.*/
                        console.log("sitting opacity of toast message to 1");
                        document.querySelector(".toast").style.opacity = 1;
                    }else{
                        console.log("toast message will not be displayed");
                        /* display a dialog box that tells the app user to double tap anywhere on the map to set a position for that contact.*/
                        document.querySelector('#user-loc-modal-window').className = "show";
                    }

                    mapDriver.registerEvent("dblclick", mapDriver.addNewMarker);
                }
             }

        }

        var handleContactSingleTap = function(ev){
            console.log("Single tap event has been recognized");
            var contactModalWindow = document.querySelector('#contacts-modal-window');

            /* display modal window that will display the contact's name as well as all phone numbers for that contact. */

            /* Get which list item have been tapped. Since hammer.js does not have currentTarget property, a bubbling
             * navigation must be done toward the parent element(s) to find out which contact has been tapped */
             // var timeStamp1 = Date.now();
             var currentTarget = ev.target;
             var contactId = currentTarget.getAttribute("data-ref");
             while(null === contactId){
                currentTarget = currentTarget.parentNode;
                contactId     = currentTarget.getAttribute("data-ref");
             }

             /* Make sure that we find a valid contanct list item */
             if(contactId){
                currentUserId = contactId;
                /* information stored in local storage. */
                var tablePlaceHolders = document.querySelectorAll("table tr td");
                tablePlaceHolders[0].innerHTML = storage.getData(currentUserId, "name");

                tablePlaceHolders[1].innerHTML ="";
                var contactAddresses = storage.getData(currentUserId, "addressess");
                for(var j=0; j<contactAddresses.length; j++ ){
                    tablePlaceHolders[1].innerHTML += contactAddresses[j] + "<br>";
                }

                tablePlaceHolders[2].innerHTML = "";
                var contactPhoneNumbers = storage.getData(currentUserId, "phoneNumbers");
                for(var j=0; j<contactPhoneNumbers.length; j++ ){
                    tablePlaceHolders[2].innerHTML += contactPhoneNumbers[j] + "<br>";
                }

                tablePlaceHolders[3].innerHTML = "";
                var contactEmails = storage.getData(currentUserId, "emails");
                for(var j=0; j< contactEmails.length; j++){
                    tablePlaceHolders[3].innerHTML += contactEmails[j] + "<br>";
                }

                // var img = tablePlaceHolders[4].querySelector("img");
                // img.src="";
                // if(contactInfo.photos){
                //     img.src = contactInfo.photos[0].value;
                // }
             }

             contactModalWindow.className = "show";

        }

        var loadDynamicContents = function(pageId){
            switch(pageId){
                case "contacts":

                    document.querySelector('.col-header:first-child').classList.add("hide");

                    /* Generate a random number from the available contacts to be displayed.
                    Note that a random number will be generated in the range (0, maximum length of contacts -1)*/

                     if(contacts.getEntries()){
                        var listView = document.querySelector('ul[data-role="listview"]');
                        /* display maximum 12 contacts. */
                        for(var i=0;
                            (i< contacts.getEntries().length) &&  (i< MAXIMUM_NUMBER_OF_DISPLAYED_CONTACTS);
                            i++){

                            var listItem = listView.querySelector('li[data-ref="'+i+'"]');

                            var contactNameTag = listItem.querySelector('p.contact-name');
                            contactNameTag.innerHTML = contacts.getDisplayName(i);

                            if(contacts.getPhoto(i)){
                                var contactPhotoTag = listItem.querySelector('img.contact-img');
                                contactPhotoTag.src = contacts.getPhoto(i);
                            }

                            listItem.classList.remove("hide");

                            /* save displayed contacts to local storage. */
                            storage.saveData(i,
                                {
                                     "name"       : contacts.getDisplayName(i),
                                     "phoneNumbers"    : contacts.getPhoneNumbers(i),
                                     "addressess" : contacts.getAddresses(i),
                                     "emails"     : contacts.getEmails(i),
                                     "latLng"     : storage.getData("latLng")
                                });
                        }
                    }


                    break;
                case "location":
                    document.querySelector('.col-header:first-child').classList.remove("hide");
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
        var doPageTransition = function( srcPageId, destPageId, isHistoryPush){

            if(srcPageId == null){

                //home page first call
                pages[destPageId].classList.add("show");
                loadDynamicContents(destPageId);
                history.replaceState(null, null, "#"+destPageId);
            }else{

                /* Set active-page class to the corresponding page. First hide the current
                page, then show the destination page. Finally start animation while showing
                the destiation page.*/
                pages[srcPageId].classList.remove("show");
                pages[srcPageId].classList.remove("active-page");

                pages[destPageId].classList.add("show");

                loadDynamicContents(destPageId);

                /* Wait for 30 msec before applying the animation of page transition. This gives the
                browser time to update all the divs before applying the animation*/
                setTimeout(animatePage, 30, pages[destPageId]);

                if (isHistoryPush)
                    history.pushState(null, null, "#" + destPageId);

                currentPageId = destPageId;
            }/* else srcPageId is not null*/

            /* after loading any page, make sure to scroll to the top of this page. */
            setTimeout(function(){
                            window.scrollTo(0,0);
                        }, 10);
        }

        //Listener for the popstate event to handle the back button
        var handleBackButton = function (ev){
            ev.preventDefault();
            var destPageId = "contacts";
            var currentPageId = "location";
            //update the visible data page.
            doPageTransition(currentPageId, destPageId, false);
        }

        var getCurrerntUserId = function(){
            return currentUserId;
        }

        return {
            init : init,
            handleBackButton: handleBackButton,
            getCurrerntUserId: getCurrerntUserId
        }
    };

    var svgClass = function(){

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
                        var group = fragment.select( 'g' );
                        myCanvas.append( group );
                    }
                })(snapCanvas));

            }
        }

        return{
            load: load
        }
    };

    var contactClass = function(){
        var numOfEntries=-1;
        var entries =
        [
            {
                displayName:"Wael Showair",
                addresses:[{formatted:"43A Waterbridge Drive, Nepean, ON"}],
                phoneNumbers:[{value:"647-773-6945"},{value:"613-346-7676"}]
            }

        ];
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

        var getDisplayName = function(index){
            var displayName = "";
            if(entries[index]){
                displayName = entries[index].displayName;
            }

            return displayName;
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

        var getPhoto = function(index){
            var photo = null;
            if(entries[index] && entries[index].photos){
                photo = entries[index].photos[0].value;
            }

            return photo;
        }

        return{
            load: load,
            getEntries: getEntries,
            getDisplayName: getDisplayName,
            getAddresses: getAddresses,
            getEmails: getEmails,
            getPhoneNumbers: getPhoneNumbers,
            getPhoto: getPhoto
        }
    };

    /* This is a bit map that represents a bit for every events that is needed to be fired before
    using locations/contacts services in the device.
    There is a bit for DOMContentLoaded event and another bit for deviceready event.
    Create a new instance for bit map with value zero which means no events have been recieved yet. */
    var readyBitMap = new bitMapClass(0);
    var position = new geolocationClass();
    var siteNavigator = new siteNavigatorClass();
    var mapDriver = new mapDriverClass();
    var contacts = new contactClass();
    var storage = new storageClass();

    var init = function(){
        document.addEventListener("deviceready", onDeviceReady, false);
        document.addEventListener("DOMContentLoaded", onPageLoaded, false);
        window.addEventListener("resize", onWindowResize, true);

        //add the listener for the back button
        window.addEventListener("popstate", siteNavigator.handleBackButton, false);
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

        var svgIcons = new svgClass();
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
};

var show0017 = new appClass();
show0017.init();