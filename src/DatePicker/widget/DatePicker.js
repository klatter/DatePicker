/*jslint nomen: true, plusplus: true, eqeq: true, unparam: false*/
/*global mx, logger, dojo, define, require, browser, devel, console, document, jQuery, alert, mendix*/
/*mendix */
/*
    DatePicker
    ========================

    @file      : DatePicker.js
    @version   : 1.0.1
    @author    : Adnan Ramlawi
    @date      : Tue, 20 Sept 2016 09:40:34 GMT
    @copyright : Capgemini
    @license   : Apache License, Version 2.0, January 2004

    Documentation
    ========================
    Datepicker - allows different input methods for dateTime objects.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom-class",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/html",

    "DatePicker/lib/jquery-1.11.2",
    "dojo/text!DatePicker/widget/template/DatePicker.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoClass, dojoAttr, dojoConstruct, dojoLang, dojoHtml, dojoQuery, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("DatePicker.widget.DatePicker", [_WidgetBase, _TemplatedMixin], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        //Variables from template
        labelName: "",
        dateWrapper: "",
        dataElementDD: "",
        dataElementMM: "",
        dataElementYY: "",


        // Parameters configured in the Modeler.
        attributeName: "", // string
        attributeLabel: "", // string
        inputFieldsSetup: null, // ddi, idi, iii
        language: null, // nl, eng, ger or fra
        futureYear: null, // bool
        dateOrder: null, // ymd, dmy, mdy
        errorDay: null, // string
        errorMonth: null, // string
        errorYear: null, // string
        errorDate: null, //string
        monthNotation: null, // long, short
        orientation: null, // horizontal or vertical
        labelwidth: null, // int

        //Object & Nodes
        _contextObj: null,
        _wgtNode: null,
        _inputNode: null,
        _alertDiv: null,
        _handles: [],
        //Variables
        monthArray: [],
        dayArray: [],
        day: null,
        month: null,
        year: null,
        className: null,
        maxYear: null,
        dateOrderArray: null,

        // dijit._WidgetBase.postCreate is called after constructing the widget.
        postCreate: function () {
            this._wgtNode = this.domNode;
            this._initialiseValues();
            this._createAllFormFields();
            this._setupValidation();
            this._addFormClasses();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized.
        update: function (obj, callback) {
            this._contextObj = obj;
            this._subscribeToAttribute();
            this._loadDate();
            mendix.lang.nullExec(callback);
        },
        // Adds classes to both label and inputfields for Layout.
        _addFormClasses: function () {
            if (this.orientation === "horizontal") {
                dojoClass.add(this.labelName, "col-sm-" + this.labelwidth);
                dojoClass.add(this.dateWrapper, "col-sm-" + (12 - this.labelwidth));
            }
        },
        // Subscibes to changes of context object.
        _subscribeToAttribute: function () {
            if (this._contextObj) {
                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.attributeName,
                    callback: dojoLang.hitch(this, function () {
                        this._loadDate();
                    })
                });
                this._handles.push(attrHandle);
            }
        },
        // if there is already a date set, get date and fill input fields.
        _loadDate: function () {
            var self = this;
            this._contextObj.fetch(this.attributeName, function (value) {
                var dateFromDB,
                    classNameSearch = "." +  self.className;

                dateFromDB = new Date(value);

                // set dates, if not set return empty value instead of NaN
                dojoQuery(classNameSearch).each(function (index, node) {
                    var id = dojoAttr.get(node, "id");
                    if (id === "day") {
                        dojoAttr.set(node, "value", dateFromDB.getDate() || "");
                    }
                    if (id === "month") {
                        dojoAttr.set(node, "value", dateFromDB.getMonth() + 1 || "");
                    }
                    if (id === "year") {
                        dojoAttr.set(node, "value", dateFromDB.getFullYear() || "");
                    }
                });

            });
        },
        // initialise all values setup in modeler, also create additional arrays used by widget.
        _initialiseValues: function () {
            // set up variables
            if (this.futureYear) {
                this.maxYear = 2100;
            } else {
                this.maxYear = new Date().getFullYear();
            }
            this.className = "dateInput-" + this.attributeName;
            this.labelName.innerHTML = this.attributeLabel;
            //create arrays
            this._initialiseDayArray();
            this._initialiseArraysBasedOnLanguage();
        },
        // basic validation for the date input parameters.
        _validateDateValue: function () {
            //set date values
            var value, isValidated = true, self = this, classNameSearch = "." + self.className;
            dojoQuery(classNameSearch).each(function (index, node) {
            //$2(classNameSearch).each(function () {
                value = node.value.replace(/\s+/g, ""); // remove spaces
                switch (dojoAttr.get(node, "id")) {
                case "day":
                    if ((value > 0) && (value <= 31)) {
                        self.day = value;
                    } else {
                        isValidated = false;
                        self._showError(self.errorDay);
                    }
                    break;
                case "month":
                    value = value - 1;
                    if ((value >= 0) && (value < 12)) {
                        self.month = value;
                    } else {
                        isValidated = false;
                        self._showError(self.errorMonth);
                    }
                    break;
                case "year":
                    if ((value > 1000) && (value <= self.maxYear)) {
                        self.year = value;
                    } else {
                        isValidated = false;
                        self._showError(self.errorYear);
                    }
                    break;
                }
            });
            if (isValidated) {
                this._setMxObjectDate();
            }
        },
        // displays error if needed.
        // input: errormessage (string)
        _showError: function (message) {
            //logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
            } else {
                this._alertDiv = dojoConstruct.create("div", {
                    "class": "alert alert-danger",
                    "innerHTML": message
                });
            }
            dojoConstruct.place(this._alertDiv, this.inputWrapperNode, "last");
            //this.inputWrapperNode.appendChild(this._alertDiv);
        },
        // removes errors
        _clearError: function () {
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },
        // checks if date is a real date that can be set (e.g feb 30 will fail). if success, set mx object attribute to date.
        _setMxObjectDate: function () {
            var date = new Date(this.year, this.month, this.day, "12", "0", "0");
            //check if date is the right date
            if (((date.getDate()) == this.day) && (date.getMonth() == this.month) && (date.getFullYear() == this.year)) {
                this._contextObj.set(this.attributeName, date);
                this._clearError();
            } else {
                this._showError(this.errorDate);
            }
        },
        // check if all fields are set and starts validation if needed.
        _setupValidation: function () {
            var allSet, value, self = this;
            dojoQuery("." + self.className).on("change", function () {

                // check if all fields are set before changing mxobject
                allSet = true;
                dojoQuery("." + self.className).each(function (index, node) {
                    value = node.value.replace(/\s+/g, "");
                    if (value === "") {
                        allSet = false;
                    }
                });
                if (allSet) {
                    self._validateDateValue();
                } else {
                    self._clearError(); // If fields are no longer all set remove error message
                }
            });
        },
        // sets up form fields, according to input order array from modeler.
        _createAllFormFields: function () {
            var dataArray, i, inputOrderArray, $ = dom.create;
            this._inputNode = $("div", {
                "class": "mx-dateinput-input-wrapper"
            });
            inputOrderArray = this.inputFieldsSetup.split(""); // d for dropdown i for input

            for (i = 0; i < inputOrderArray.length; i++) {
                dataArray = this._getDataAndType(i);
                if (inputOrderArray[i] === "d") {
                    this._inputNode.appendChild(this._createDropdown(dataArray));
                } else {
                    this._inputNode.appendChild(this._createInputField(dataArray));
                }
            }
            this.inputWrapperNode.appendChild(this._inputNode);
        },
        // gets the needed parameter for create functions.
        // input: i = 0-2, depending on which element is created
        // output: Array [placeholder, type, dataArray]
        _getDataAndType: function (i) {
            var dateOrderArray = this.dateOrder.split("");
            if (dateOrderArray[i] === "d") {
                return ["DD", "day", this.dayArray];
            }
            if (dateOrderArray[i] === "m") {
                return ["MM", "month", this.monthArray];
            }
            return ["YYYY", "year"];
        },
        // sets locale languagestring to create arrays.
        _initialiseArraysBasedOnLanguage: function () {
            var i, languageString;
            switch (this.language) {
            case "nl":
                languageString = "nl-NL";
                break;
            case "eng":
                languageString = "en-US";
                break;
            case "ger":
                languageString = "de-DE";
                break;
            case "fra":
                languageString = "fr";
                break;
            }
            if (this.monthArray.length !== 0) { //create new month array if other month dropdown is used.
                this.monthArray = [];
            }
            for (i = 0; i < 12; i++) { //start at 1 to start array with januari
                //problems with daylightsaving time -> IE/Opera/Safari handles this differently than Chrome + FF
                this.monthArray.push(new Date(2000, i, 1, 12, 0).toLocaleString(languageString, {month: this.monthNotation}));
            }
        },
        // creates day array 01-31
        _initialiseDayArray: function () {
            var i;
            if (this.dayArray.length === 0) { // only create a new dayarray if dayarray is not created yet.
                for (i = 1; i <= 31; i++) {
                    this.dayArray.push(("0" + i).slice(-2)); //make sure single digits get leading 0
                }
            }
        },
        // creates an input field.
        // input: dataArray [0 = placeholder, 1 = type, 2 = dataArray]
        // returns: input domNode
        _createInputField: function (dataArray) {
            var $, inputNode;

            $ = dom.create;
            inputNode = $("input", {
                "class": "form-control mx-dateinput-input " + this.className,
                value: "",
                "id": dataArray[1],
                "placeholder": dataArray[0],
                "style" : "width:125px; display:inline-block; margin-right: 10px;",
                "data-dojo-attach-point" : "dataElement" + dataArray[0]
            });
            return inputNode;
        },
        // create a dropdown.
        // input: dataArray [0 = placeholder, 1 = type, 2 = dataArray]
        // returns: selection domNode
        _createDropdown: function (dataArray) {
            var $, selectNode, indexModifier = 1;
            $ = dom.create;
            selectNode =  $("select", {
                "class": "form-control " + this.className,
                "id": dataArray[1],
                "style" : "width:125px; display:inline-block; margin-right: 10px;",
                "data-dojo-attach-point" : "dataElement" + dataArray[0]
            });
            dojo.forEach(dataArray[2], function (item, index) {
                dojo.create("option", {
                    value: index + indexModifier,
                    innerHTML: item
                }, selectNode
                    );
            });
            return selectNode;
        }
    });
});
require(["DatePicker/widget/DatePicker"], function () {
    "use strict";
    return;
});
