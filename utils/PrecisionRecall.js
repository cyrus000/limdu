var hash = require("./hash");
var sprintf = require('sprintf').sprintf;
var _ = require('underscore')._;

/**
 * PrecisionRecall - an object for tracking results of experiments: precision, recall, f1, and execution time.
 * 
 * @author Erel Segal-haLevi
 * @since 2013-06
 */
var PrecisionRecall = function() {
	this.count = 0;
	this.TP = 0;
	this.TN = 0;
	this.FP = 0;
	this.FN = 0;
	this.TRUE = 0;
	this.startTime = new Date();
	this.labels = {}
}

PrecisionRecall.prototype = {
		
	/**
	 * Record the result of a new binary experiment.
	 * 
	 * @param expected - the expected result (true/false).
	 * @param actual   - the actual   result (true/false).
	 */
	addCase: function(expected, actual) {
		this.count++;
		if (expected && actual) this.TP++;
		if (!expected && actual) this.FP++;
		if (expected && !actual) this.FN++;
		if (!expected && !actual) this.TN++;
		if (expected==actual) this.TRUE++;
	},

	/**
	 * Record the result of a new classes experiment per labels.
	 *
	 * @param expectedClasses - the expected set of classes (as an array or a hash).
	 * @param actualClasses   - the actual   set of classes (as an array or a hash).
	 * @return an array of explanations "FALSE POSITIVE", "FALSE NEGATIVE", and maybe also "TRUE POSITIVE"
	 */

addCasesLabels: function (expectedClasses, actualClasses ) {
		var explanations = [];
		actualClasses = hash.normalized(actualClasses);
		expectedClasses = hash.normalized(expectedClasses);

		var allTrue = true;
		for (var actualClass in actualClasses) {

			if (!(actualClass in this.labels)) {
				this.labels[actualClass]={}
				this.labels[actualClass]['TP']=0
				this.labels[actualClass]['FP']=0
				this.labels[actualClass]['FN']=0
				}

			if (actualClass in expectedClasses) { 
				this.labels[actualClass]['TP'] += 1 

			} else {
				this.labels[actualClass]['FP'] += 1 
			}
		}
		for (var expectedClass in expectedClasses) {

			if (!(expectedClass in this.labels)) {
				this.labels[expectedClass]={}
				this.labels[expectedClass]['TP']=0
				this.labels[expectedClass]['FP']=0
				this.labels[expectedClass]['FN']=0
				}

			if (!(expectedClass in actualClasses)) {
				this.labels[expectedClass]['FN'] += 1 
			}
		}
	},

	/**
	 * Record the result of a new classes experiment.
	 *
	 * @param expectedClasses - the expected set of classes (as an array or a hash).
	 * @param actualClasses   - the actual   set of classes (as an array or a hash).
	 * @param logTruePositives- if true, log the true positives. 
	 * @return an array of explanations "FALSE POSITIVE", "FALSE NEGATIVE", and maybe also "TRUE POSITIVE"
	 */
	addCases: function (expectedClasses, actualClasses, logTruePositives) {
		var explanations = [];
		actualClasses = hash.normalized(actualClasses);
		expectedClasses = hash.normalized(expectedClasses);

		var allTrue = true;
		for (var actualClass in actualClasses) {
			if (actualClass in expectedClasses) { 
				if (logTruePositives) explanations.push("\t\t+++ TRUE POSITIVE: "+actualClass);
				this.TP++;
			} else {
				explanations.push("\t\t--- FALSE POSITIVE: "+actualClass);
				this.FP++;
				allTrue = false;
			}
		}
		for (var expectedClass in expectedClasses) {
			if (!(expectedClass in actualClasses)) {
				explanations.push("\t\t--- FALSE NEGATIVE: "+expectedClass);
				this.FN++;
				allTrue = false;
			}
		}
		if (allTrue) {
			if (logTruePositives) explanations.push("\t\t*** ALL TRUE!");
			this.TRUE++;
		}
		this.count++;
		return explanations;
	},

/**
	 * Record the result of a new classes experiment in a hash manner.
	 * Doesn't allowed to do a inner output, all stats are put in hash
	 * @param expectedClasses - the expected set of classes (as an array or a hash).
	 * @param actualClasses   - the actual   set of classes (as an array or a hash).
	 * @param logTruePositives- if true, log the true positives. 
	 * @return an array of explanations "FALSE POSITIVE", "FALSE NEGATIVE", and maybe also "TRUE POSITIVE"
     * @author Vasily Konovalov
	 */
	addCasesHash: function (expectedClasses, actualClasses, logTruePositives ) {
		var explanations = {};
		explanations['TP'] = []; explanations['FP'] = []; explanations['FN'] = [];

		actualClasses = hash.normalized(actualClasses);
		expectedClasses = hash.normalized(expectedClasses);

		var allTrue = true;
		for (var actualClass in actualClasses) {
			if (actualClass in expectedClasses) { 
				if (logTruePositives) explanations['TP'].push(actualClass);
				this.TP++;
			} else {
				explanations['FP'].push(actualClass);
				this.FP++;
				allTrue = false;
			}
		}
		for (var expectedClass in expectedClasses) {
			if (!(expectedClass in actualClasses)) {
				explanations['FN'].push(expectedClass);
				this.FN++;
				allTrue = false;
			}
		}
		if (allTrue) {
			// if ((logTruePositives)&& (!only_false_cases)) explanations.push("\t\t*** ALL TRUE!");
			this.TRUE++;
		}
		this.count++;

		return explanations;
	},
	
	retrieveLabels: function()
	{
		// if there are any data per labels calculate it
		label_output = []
		label_hash = {}

		// console.log(this.labels)
		// process.exit(0)

		_.each(Object.keys(this.labels), function(label, key, list){ 
			
			this.labels[label]['Recall'] = this.labels[label]['TP'] / (this.labels[label]['TP'] + this.labels[label]['FN']);
			this.labels[label]['Precision'] = this.labels[label]['TP'] / (this.labels[label]['TP'] + this.labels[label]['FP']);
			this.labels[label]['F1'] = 2 / (1/this.labels[label]['Recall'] + 1/this.labels[label]['Precision'])
			this.labels[label]['Frequency'] = (this.labels[label]['TP'] +this.labels[label]['FN'] )/(this.TP+this.FN)

			if (!this.labels[label]['F1']) this.labels[label]['F1'] = -1
							
			label_output.push([label, this.labels[label]['F1'], this.labels[label]['Frequency'], this.labels[label]['TP'] + this.labels[label]['FN']])
					
			}, this)

			label_output = _.sortBy(label_output, function(item){ return item[1]; });

		for (label in label_output)
			{
			label_hash[label_output[label][0]] = {}
			label_hash[label_output[label][0]]['F1'] = label_output[label][1]
			label_hash[label_output[label][0]]['Frequency'] = label_output[label][2]
			label_hash[label_output[label][0]]['Occurences'] = label_output[label][3]
			}

		return label_hash
	},

	retrieveStats: function()
	{
		this.calculateStatsNoReturn()
		stats = {}
		stats['Accuracy'] = this.Accuracy
		stats['HammingLoss'] = this.HammingLoss
		stats['HammingGain'] = this.HammingGain
		stats['Precision'] = this.Precision
		stats['Recall'] = this.Recall
		stats['F1'] = this.F1
		stats['shortStatsString'] = this.shortStatsString
		return stats
	},

	calculateStatsNoReturn: function() {
		this.Accuracy = (this.TRUE) / (this.count);
		this.HammingLoss = (this.FN+this.FP) / (this.FN+this.TP); // "the percentage of the wrong labels to the total number of labels"
		this.HammingGain = 1-this.HammingLoss;
		this.Precision = this.TP / (this.TP+this.FP);
		this.Recall = this.TP / (this.TP+this.FN);
		this.F1 = 2 / (1/this.Recall + 1/this.Precision);
		this.endTime = new Date();
		this.timeMillis = this.endTime-this.startTime;
		this.timePerSampleMillis = this.timeMillis / this.count;
		this.shortStatsString = sprintf("Accuracy=%d/%d=%1.0f%% HammingGain=1-%d/%d=%1.0f%% Precision=%1.0f%% Recall=%1.0f%% F1=%1.0f%% timePerSample=%1.0f[ms]",
				this.TRUE, this.count, this.Accuracy*100, (this.FN+this.FP), (this.FN+this.TP), this.HammingGain*100, this.Precision*100, this.Recall*100, this.F1*100, this.timePerSampleMillis);
		},

	/**
	 * After the experiment is done, call this method to calculate the performance statistics.
	 */
	calculateStats: function() {
		this.calculateStatsNoReturn()
		return this;
	},
	
	calculateMacroAverageStats: function(numOfFolds) {
		hash.multiply_scalar(this, 1.0/numOfFolds);
		this.shortStatsString = sprintf("Accuracy=%1.0f%% HammingGain=%1.0f%% Precision=%1.0f%% Recall=%1.0f%% F1=%1.0f%% timePerSample=%1.0f[ms]",
				this.Accuracy*100, this.HammingGain*100, this.Precision*100, this.Recall*100, this.F1*100, this.timePerSampleMillis);
	},
	
	
	/**
	 * @return the full set of statistics for the most recent experiment.
	 */
	fullStats: function() { 
		return this; 
	},
	
	/**
	 * @return a one-line summary of the main results of the most recent experiment.
	 */
	shortStats: function() {
		return this.shortStatsString;
	}
}

module.exports = PrecisionRecall;
