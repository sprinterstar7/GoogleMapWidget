/**
 * @fileOverview    Dynamic Buckets
 * @author          Takashi Binns
 * @version         V2.0
 * @SiSenseVersion  V5.7.7
 **/

/**
Group x-Axis into buckets according to first value. Bucket size (y-Axis) is a sum of the second value

Example 1: Manually define ranges

 //	Define the plugin options
var options = {
	type: "manual",				//	(required) Can be 'auto' or 'manual'
	separator: " - ",			//	(optional) If the ranges aren't named, create one using the min & max values and this separator
	ranges: [					//	Manually define the buckets you want to use
		//	This will group any values less or equal to 1
		{
			name: "Bad",		//	Label for the bucket
			color: "red",		//	Color can be text or a hex code
			min: null,			//	The lower limit for the bucket, put null for no lower limit
			max: 1				//	The upper limit for the bucket, put null for no upper limit
		},
		//	This will group any values between 1 & 10
		{
			name: "OK",
			color: "yellow",
			min: 1,
			max: 10
		},
		//	This will group any values greater than 10
		{
			name: "Good",
			color: "green",
			min: 10,
			max: null
		}
	]
};

//	Run the function to create buckets
prism.dynamicBuckets(widget,options);


Example 2: Automatically define ranges

 //	Define the plugin options
var options = {
	type: "auto",				//	(required) Can be 'auto' or 'manual'
	separator: " - ",			//	(optional) If the ranges aren't named, create one using the min & max values and this separator
	numberOfBuckets: 2			//	(required) How many buckets should we calculate
};

//	Run the function to create buckets
prism.dynamicBuckets(widget,options);
 **/

prism.dynamicBuckets = function (widget, options) {

	//////////////////////////////////
	//	Registering widget events	//
	//////////////////////////////////

	//	Setting data limitation to 2000000, rendering performance might suffer from client side overload
	widget.on('buildquery', function(widget, ev) {

		//	Don't do anything, if this is a pivot table
		if (widget.type === 'pivot'){
			return;
		}
		//	Set the row count limit
		ev.query.count = 2000000;
	});

	//	Transform the result set into buckets
	widget.on('processresult', function(widget, ev) {
		//	Check if 2 values are defined
		if (!ev.result.series || ev.result.series.length < 2){
			return;
		}

		//	Create bucket groups
		var buckets = [];
		ev.result.xAxis.categories = [];

		//	Check for bucket type
		var type = options.type;

		//	Add formatting to the options object
		options.formatting = widget.metadata.panels[1].items[0].format.mask;

		//	Create buckets differently for each type
		switch(type) {
			case "manual":
				buckets = calculateBucketsManually(ev, options);
				break;
			case "auto":
				buckets = calculateBucketsAuto(ev, options);
				break;
			default:
				break;
		}

		//	Set bucket values in the chart object
		createBuckets(ev, buckets);
		
		//	Force chart settings
		widget.options.dashboardFiltersMode = "select";
		widget.options.selector = true;
	});

	//////////////////////////
	//	Utility Functions	//
	//////////////////////////

	//	Function to set a dashboard filter, when a user clicks on a bucket
	function setFilter(){
		
		//	Create a filter object
		var filter = {
			explicit: true,
			multiSelection: true,
			members: this.selectionData
		};

		//	Get the filter jaql
		var jaql = this.selectionDim;

		//	Modify the jaql to include the filter selection(s)
		jaql.filter = filter;
		jaql.collapsed = true;
		delete jaql.in;
		delete jaql.merged;

		//	Add/Update the filter for the dashboard
		prism.activeDashboard.filters.update(jaql,{refresh:true, save:true});

	}

	//	Create buckets from a manually entered range
	function calculateBucketsManually(ev, options){

		//	Start with an empty array for the buckets
		var buckets = [];

		//	Start with an empty array for the categories
		var categories = [];

		//	Get the range specified by the user
		var ranges = options.ranges;

		//	Loop through each data series
		for (var j = 0; j <  ev.result.series.length - 1; j++) {

			//	Create an array for this data series
			buckets[j] = [];

			//	Make sure a separator is defined
			var separator = options.separator ? options.separator : "-";

			//	Create a new range for this data series
			var myRange = $.extend(true, [], ranges);

			//	Loop through each value in this series
			for (var i = 0; i < myRange.length; i++) {

				//	Add some extra properties to the range
				myRange[i].members = [];
				myRange[i].count = 0;

				//	Save the current range to the buckets list
				buckets[j].push(myRange[i]);

				//	Figure out the label to use
				var label = myRange[i].name ? myRange[i].name : (min == null ? '' : min) + separator + (max == null ? '' : max);

				//	Only need to add the axis labels once
				if (j==0) {
					//	Show the label on the x-axis
					ev.result.xAxis.categories.push(label);
				}
			}
		}

		//	Return the finished buckets object
		return buckets;
	}

	//	Calculate buckets based on the values
	function calculateBucketsAuto(ev, options){

		//	The number of buckets to create
		var number_of_buckets = options.numberOfBuckets;

		//	The separator to use
		var separator = options.separator ? options.separator : " - ";

		//	Get the data series
		var data = ev.result.series[0].data;

		//	Start with an empty list for the buckets
		var buckets = [];

		//	Pick a default minimum and maximum
		var max_value_y_axis = Math.ceil(+(data[data.length - 1].y));
		var min_value_y_axis = Math.floor(+(data[0].y));

		//	Loop through each data point
		data.forEach(function(e) {

			//	Check for the max value (rounded up)
			if (e.y > max_value_y_axis){
				max_value_y_axis = Math.ceil(+(e.y));
			}

			//	Check for the min value (rounded down)
			if (e.y < min_value_y_axis){
				min_value_y_axis =  Math.floor(+(e.y));
			}
		});

		//	Calculate the intervals to make x number of buckets
		var range = (max_value_y_axis - min_value_y_axis);
		var unroundedTickSize = range/(number_of_buckets);
		var x = Math.ceil(Math.log10(unroundedTickSize)-1);
		var pow10x = Math.pow(10, x);
		//var bucket_interval = Math.ceil((max_value_y_axis - min_value_y_axis) / number_of_buckets);
		var bucket_interval = Math.ceil(unroundedTickSize / pow10x) * pow10x;
		if ((bucket_interval * (number_of_buckets-1))> max_value_y_axis) {
			bucket_interval = bucket_interval*(number_of_buckets-1)/number_of_buckets;
		}

		//	Loop through each data series
		for (var i = 0; i <  ev.result.series.length - 1; i++) {

			//	Add an empty array for this series
			buckets[i] = [];

			//	Loop through data points in this series
			for (var j = 0; j < number_of_buckets; j++) {

				//	Calculate the min and max values
				var min = min_value_y_axis + (bucket_interval * j);
				var max = min_value_y_axis + bucket_interval * (j + 1);

				//	Add a bucket object for this point
				buckets[i].push({min: min, max: max, count: 0, members:[]})

				//	Add the labels if necessary
				if (!i){

					//	Create a label using the defined formatting
					var label = formatter(min,options.formatting) + separator + formatter(max,options.formatting);
					//ev.result.xAxis.categories.push(min + separator + max);
					ev.result.xAxis.categories.push(label);
				}
			}
		}

		//	Return the buckets object
		return buckets;
	}

	function formatter(originalValue, format){
		
		//	Grab the original value
		var value = originalValue;

		//	Init the label
		var label = "";

		//	Use variables for rounding thresholds
		var trillion = 1000000000000;
		var billion  = 1000000000;
		var million  = 1000000;
		var thousand = 1000;

		//	Handle decimal places
		var decimalPlaces = format.decimals == 'auto' ? 1 : format.decimals;
		var decimalPadding = Math.pow(10, decimalPlaces);

		//	Create variables for prefix and postfix
		var prefix = '';
		var postfix = '';

		//	Apply rounding, if necessary
		if (format.abbreviations) {
			if (value > trillion) {
				//	Apply rounding up to trillions
				if (format.abbreviations.t) {
					value = Math.round(decimalPadding * value/trillion)/decimalPadding;
					postfix = 'T';
				} else if (format.abbreviations.b) {
					value = Math.round(decimalPadding * value/billion)/decimalPadding;
					postfix = 'B';
				} else if (format.abbreviations.m) {
					value = Math.round(decimalPadding * value/million)/decimalPadding;
					postfix = 'M';
				} else if (format.abbreviations.k) {
					value = Math.round(decimalPadding * value/thousand)/decimalPadding;
					postfix = 'K';
				}
			} else if (value > billion) {
				//	Apply rounding up to billions
				if (format.abbreviations.b) {
					value = Math.round(decimalPadding * value/billion)/decimalPadding;
					postfix = 'B';
				} else if (format.abbreviations.m) {
					value = Math.round(decimalPadding * value/million)/decimalPadding;
					postfix = 'M';
				} else if (format.abbreviations.k) {
					value = Math.round(decimalPadding * value/thousand)/decimalPadding;
					postfix = 'K';
				}
			} else if (value > million) {
				//	Apply rounding up to millions
				if  (format.abbreviations.m) {
					value = Math.round(decimalPadding * value/million)/decimalPadding;
					postfix = 'M';
				} else if (format.abbreviations.k) {
					value = Math.round(decimalPadding * value/thousand)/decimalPadding;
					postfix = 'K';
				}
			} else if (value > thousand) {
				//	Apply rounding up to thousands
				if  (format.abbreviations.k) {
					value = Math.round(decimalPadding * value/thousand)/decimalPadding;
					postfix = 'K';
				}
			}
		}

		//	Check for currency
		if (format.currency) {
			if (format.currency.position == "pre") {
				prefix = format.currency.symbol;
			} else {
				postfix = postfix + ' ' + format.currency.symbol;
			}
		}

		//	Check for percent
		if (format.percent) {
			value = Math.round(value * 100 * decimalPadding) / decimalPadding;
			postfix = '%';
		}

		//	Set the # of decimal places
		if (format.decimals != "auto") {
			value = value.toFixed(decimalPlaces);
		}

		//	Create a label for the value
		value = prefix + value + postfix;

		//	Return the formatted value
		return value;
	}

	//	Group the members into buckets, update the chart
	function createBuckets(ev, buckets){

		//	Save the dim for filters later
		var filterDim = ev.rawResult.metadata[0].jaql;
		
		//	Loop through each series and add values to each bucket
		for (var series_number = 0; series_number <  ev.result.series.length - 1; series_number++) {
			
			//	Loop through each value in this series
			for (var i = 0; i < ev.result.series[series_number + 1].data.length; i++) {

				//	Get the data point
				var y_axis_val = ev.result.series[0].data[i].y;

				//	Loop through each bucket to see where to put this data point
				for (var j = 0; j < buckets[series_number].length; j++) {

					//	Check if value is less than the max, and there is no min for this bucket
					var check1 = (buckets[series_number][j].min == null && y_axis_val <  buckets[series_number][j].max);
					
					//	Check if value is greater than the min, and there is no max for this bucket
					var check2 = (buckets[series_number][j].max == null && y_axis_val >=  buckets[series_number][j].min);
					
					//	Check if value is between min & max for this bucket
					var check3 = ((buckets[series_number][j].min != null && y_axis_val >=  buckets[series_number][j].min) && (buckets[series_number][j].max != null && y_axis_val <  buckets[series_number][j].max));
					
					//	Did any of the checks pass?
					if (check1 || check2 || check3){
						
						//	Increment the count for this bucket
						buckets[series_number][j].count += ev.result.series[series_number + 1].data[i].y;

						//	Save the member, so we can filter if a user clicks on this group
						buckets[series_number][j].members.push(ev.result.series[series_number + 1].data[i].selectionData[0]);
					}
				}
			}
		}
		
		//	Loop through each series in the chart and update y-axis values for each bucket
		for (var series_number = 1; series_number < ev.result.series.length; series_number++) {

			//	Remove the old series' data, and start with an empty array
			delete ev.result.series[series_number].data;
			ev.result.series[series_number].data = [];

			//	Loop through each bucket, and add them as new data points
			for (var i = 0; i < buckets[series_number - 1].length; i++) {

				//	Create a new data point for this bucket
				var dataPoint = {
					y: buckets[series_number - 1][i].count,					//	The new value displayed will be the count
					color: buckets[series_number -1][i].color,				//	Save the color for this bucket
					selectionData: buckets[series_number - 1][i].members,	//	Save the list of members for this bucket
					selectionDim: filterDim,								//	Save the filter JAQL
					events: {
						click: setFilter									//	Override the click event for the chart, so that a filter can be added
					}
				}

				//	Add the new data point
				ev.result.series[series_number].data.push(dataPoint);
			}
		}

		//	Get rid of the very first data series, as it was only used included to calculate the groups
		ev.result.series.splice(0,1);
	}
}