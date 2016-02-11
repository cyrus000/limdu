/*
	This module was created as a utils for limdu, many of the routines were copied from train.js of nlu-server.
	The main function of the following methods is helping to represent the analysis of given data.
	This module contains: 
		* the hierarchical representation of the labels.
		* routines for aggregating statistics after cross - validation.
		* routine for building confusion matrix.
		* auxiliary routine for building table in html format.
		* routine for building intent attribute distribution.
		* etc.

	@author Vasily Konovalov
 */
var execSync = require('child_process').execSync
var _ = require('underscore')._;
var fs = require('fs');
var multilabelutils = require('../classifiers/multilabel/multilabelutils');

labeltree = { Offer: 
   { Salary: { '12,000 NIS': {}, '7,000 NIS': {}, '20,000 NIS': {} },
     'Job Description': 
      { QA: {},
        'Team Manager': {},
        Programmer: {},
        'Project Manager': {} },
     'Pension Fund': { '10%': {}, '0%': {}, '20%': {}, 'No agreement': {} },
     'Working Hours': { '10 hours': {}, '9 hours': {}, '8 hours': {} },
     'Promotion Possibilities': { 'Fast promotion track': {}, 'Slow promotion track': {} },
     'Leased Car': 
      { 'Without leased car': {},
        'With leased car': {},
        'No agreement': {} } },
  Insist: 
   { 'Pension Fund': {},
     'Working Hours': {},
     previous: {},
     'Job Description': {},
     'Promotion Possibilities': {},
     Salary: {},
     'Leased Car': {} },
  Greet: { true: {} },
  Reject: 
   { Salary: {},
     'Leased Car': {},
     previous: {},
     'Pension Fund': {},
     'Job Description': {},
     'Working Hours': {},
     'Promotion Possibilities': {} },
  Accept: 
   { previous: {},
     Salary: {},
     'Pension Fund': {},
     'Working Hours': {},
     'Leased Car': {},
     'Job Description': {},
     'Promotion Possibilities': {} },
  Query: 
   { 'Job Description': {},
     accept: {},
     compromise: {},
     bid: {},
     'Working Hours': {},
     'Leased Car': {},
     'Pension Fund': {},
     Salary: {},
     issues: {},
     'Promotion Possibilities': {} },
  Append: { previous: {} },
  Quit: { true: {} } }

module.exports.aggregate_results = function(stats)
{
	results = _.reduce(stats, function(memo, obj) {
	  return {
	    F1: memo.F1 + obj.F1,
	    Precision: memo.Precision + obj.Precision,
	    Recall: memo.Recall + obj.Recall,
	    Accuracy: memo.Accuracy + obj.Accuracy,
	  };
	}, {F1: 0, Precision: 0, Recall: 0, Accuracy: 0})

	_.each(results, function(value, key, list){ 
		results[key] = value/stats.length
		}, this)
	return results
}


/*@input - array of hashes, as a input given after cross -  validation
@output - hash that aggregates all statistics from the input*/
module.exports.aggregate_two_nested = function(stats)
{
	b = _.reduce(stats, function(memo, obj) {
	h = _.clone(memo)

	_.each(obj, function(value, label, list){ 
		if (!(label in h ))
			h[label] = {}
		_.each(_.keys(value), function(param, key, list){ 
			if (param in h[label])
				h[label][param] = h[label][param] + obj[label][param]
			else
				h[label][param] = obj[label][param]
  		}, this)
	}, this)

	return h
	}, {}, this)

	_.each(b, function(value, key, list){ 
		_.each(value, function(value1, key1, list){ 
			b[key][key1] = value1/stats.length
		}, this)
	}, this)
	return b
}

/*@input - stats from test
@output - confusion matrix in multi-label case*/
module.exports.confusion_matrix = function(stats)
{	
	matrix = {}
	_.each(stats['data'], function(value, key, list){ 
		_.each(value['explanation']['TP'], function(value1, key, list){ 
			if (!(value1 in matrix))
				matrix[value1] = {}
			if (!(value1 in matrix[value1]))
				matrix[value1][value1] = 0
			matrix[value1][value1] = matrix[value1][value1] + 1
		}, this)

		_.each(value['explanation']['FP'], function(value1, key, list){ 
			if (!(value['explanation']['FN']))
				value['explanation']['FN'] = []
			_.each(value['explanation']['TP'].concat(value['explanation']['FN']), function(value2, key, list){ 
				if (!(value2 in matrix))
					matrix[value2] = {}
				if (!(value1 in matrix[value2]))
					matrix[value2][value1] = 0
				matrix[value2][value1] = matrix[value2][value1] + 1
			}, this)
		}, this)

		_.each(value['explanation']['FN'], function(value1, key, list){ 
			if (!(value1 in matrix))
				matrix[value1] = {}
			if (!("nolabel" in matrix[value1]))
				matrix[value1]["nolabel"] = 0
			matrix[value1]["nolabel"] = matrix[value1]["nolabel"] + 1
			
		}, this)			

	}, this)

	return matrix
}

/*@input - hash that represents table
@output - html table*/
module.exports.hash_to_htmltable = function(labelhash)
{
	keys = []
	_.each(labelhash, function(value, key, list){ 
		_.each(value, function(value1, key1, list){ 
			keys.push(key1)
			}, this)
		}, this)

	labelheader = Object.keys(labelhash)
	labelheader.push("nolabel")

	console.log("<html><body><table border=1 style='border-collapse: collapse'>")
	console.log("<th><td>"+((labelheader)).join("</td><td>")+"</td></th>")

_.each(labelhash, function(value, key, list){
	console.log("<tr><td>"+	(buildstringnosum(key, value, labelheader)).join("</td><td>")+"</td></tr>")
	}, this)

		console.log("</table>")
		console.log()
		process.exit(0)

}


// @stats - dataset in the format after test_hash, i.e. the hash with parameters 'data', 'stats', 'labels'
// output is the data labels where there is an error
module.exports.filtererror = function(stats)
{
	stats_filtered=[]
	 _.each(stats['data'], function(value, key, list){ 
		if ((value['explanation']['FP'].length != 0) || (value['explanation']['FN'].length != 0))
		{
		stats_filtered.push(value)	
		}
	});
	return stats_filtered
}


module.exports.bars_hash = function(data)
{ 
	labelhash = {}
	_.each(data, function(value, key, list){
		output = _.flatten((splitPartEqually(multilabelutils.normalizeOutputLabels(value.output))))		
		_.each(output, function(lab, key, list){
			if (!(lab in labelhash))
				{
				labelhash[lab] = {}
				labelhash[lab]['train'] = 0 
				}
			else
				labelhash[lab]['train'] =  labelhash[lab]['train'] + 1
			}, this)

		}, this)
	return labelhash
}

module.exports.bars_original = function(data)
{	
	alllabel = []
	_.each(data, function(value, key, list){
		alllabel = alllabel.concat(value.output)
	}, this)

	aggreg = _.countBy(alllabel, function(num) {return num})

	aggreglist = []
	_.each(aggreg, function(value, key, list){ 
		aggreglist.push([key,value])
		}, this)

	aggregarray = _.sortBy(aggreglist, function(num){ return num[0]});


	_.each(aggregarray, function(value, key, list){
		console.log(value[0])
		}, this)

	process.exit(0)

	// _.each(aggregarray, function(value, key, list){ 
	// 		console.log(value[0]+"\t"+value[1])
	// 	}, this)
}

/*@input - dataset
@output - the table in html format with intent attribute cooccurence.*/
module.exports.intent_attr_matrix = function(data)
{

labelhash = {}
labelheader = []

_.each(data, function(value, key, list){ 
	output = splitPartEqually(multilabelutils.normalizeOutputLabels(value.output))

	_.each(output[0], function(intent, key, list){ 
		if (!(intent in labelhash))
			labelhash[intent] = []
		labelheader = labelheader.concat(output[1])
		labelhash[intent] = labelhash[intent].concat(output[1])
	}, this)
}, this)

labelheader = _.uniq(labelheader)

_.each(labelhash, function(value, key, list){ 
	labelhash[key] = _.countBy(value, function(num) { return num })
}, this)

console.log("<html><body><table border=1 style='border-collapse: collapse'>")
console.log("<th><td>"+((labelheader)).join("</td><td>")+"</td></th>")

_.each(labelhash, function(value, key, list){
	console.log("<tr><td>"+	(buildstring(key, value, labelheader)).join("</td><td>")+"</td></tr>")
	}, this)

labelmarginal = []
_.each(labelheader, function(label, key, list){ 
	agg = 0
	_.each(labelhash, function(value, key, list){ 
		if (label in value)
			agg = agg + value[label]
		}, this)
	labelmarginal.push(agg)
	}, this)

console.log("<tr><td></td><td>"+labelmarginal.join("</td><td>")+"</td></tr>")
console.log("</table>")
}

function buildstring(intent, valhash, labelheader)
{
	str = [intent]
	_.each(labelheader, function(value, key, list){ 
		if (value in valhash)
			str.push(valhash[value])
		else
			str.push(0)
		}, this)

	sum = _.reduce(_.rest(str), function(memo, num){ return memo + num; }, 0)
	str.push(sum)
	return str
}


function buildstringnosum(intent, valhash, labelheader)
{
	str = [intent]
	_.each(labelheader, function(value, key, list){ 
		if (value in valhash)
			str.push(valhash[value])
		else
			str.push(0)
		}, this)
	return str
}

/*
@input - data - dataset
@output - set of graphs with distributions of intent and attributes.*/
module.exports.intent_attr_dist = function(data)
{
	alllabelhash = {}
	_.each(data, function(value, key, list){
			jsonlablist = value['output'].map(splitJson)
			_.each(jsonlablist, function(value1, key, list){ 
				if (!(value1[0] in alllabelhash))
					alllabelhash[value1[0]] = []
				alllabelhash[value1[0]].push(value1[1])
				}, this)
	}, this)

	_.each(alllabelhash, function(value, key, list){ 
		alllabelhash[key] = _.sortBy(_.pairs(_.countBy(value, function(num) {return num})),1)
		}, this)

	filehash = {}
	_.each(alllabelhash, function(hashattribute, intent, list){ 
		str = ""
		num = 0
		_.each(hashattribute, function(occurence, attribute, list){ 
			str = str + num + "\t\""+occurence[0]+"\"\t"+ occurence[1]+"\n"
			num = num + 1
			}, this)
		filehash[intent] = str
	}, this)

	_.each(filehash, function(value, intent, list){ 
		fs.writeFileSync(intent, value, 'utf-8', function(err) {console.log("error "+err); return 0 })
	}, this)

	_.each(alllabelhash, function(value, intent, list){ 
		command = "gnuplot -p -e \"reset; set term png truecolor size 1500,800; set grid ytics; set grid xtics; set output \'"+intent+".png\'; set boxwidth 0.5; set style fill solid; plot \'"+intent+"\' using 1:3:xtic(2) with boxes\""
		result = execSync.run(command)
	}, this)
	process.exit(0)
}


/*@data is a dataset in the original format (array of JSON with input output parameters)
output - list of the labels and the occurrences of the labels in the dataset.*/
module.exports.bars = function(data)
{ 	
	lalelarray = []
	lalelarray.push([])
	lalelarray.push([])
	lalelarray.push([])

	_.each(data, function(value, key, list){
		output = splitPartEqually(multilabelutils.normalizeOutputLabels(value.output))

		_.each(output, function(value, key, list){ 
			lalelarray[key]  = lalelarray[key].concat(value)
		}, this)
	}, this)

	labelgroup=[]
	_.each(lalelarray, function(value, key, list){
		labelgroup.push([])
		_.each(_.countBy(value, function(num) {return num}), function(value1, key1, list1){ 
			labelgroup[key].push([key1,value1])
			}, this)
	},this)

	labelsorted = []
	_.each(labelgroup, function(value, key, list){ 
		labelsorted.push(_.sortBy(value, function(num){ return num[1]}))
		}, this)


	_.each(labelsorted, function(value, key, list){ 
		_.each(value, function(value1, key, list){ 
				console.log(value1[0]+"\t"+value1[1])
			}, this)
		}, this)
	return labelsorted
}

// @data is a dataset in the original format (array of JSON with input output parameters)
// output - tree with the hierarchy of the labels.
module.exports.labeltree = function(data)
	{
	Observable = {}
		_.each(data, function(datum, key, list){				
			_.each(multilabelutils.normalizeOutputLabels(datum.output), function(lab, key, list){				
				_.each(splitJson(lab), function(element, key, list){
					if (key==0)
						if (!(element in Observable))
								Observable[element] = {}
					if (key==1)
						if (!(element in Observable[list[key-1]]))
								Observable[list[key-1]][element] = {}
					if (key==2)
						if (!(element in Observable[list[key-2]][list[key-1]]))
								Observable[list[key-2]][list[key-1]][element] = {}

				}, this)
			}, this)
		}, this)
	return Observable
	}

module.exports.extend_dict = function(aggreg, current)
	{
		for (label in current)
		{
			if (!(label in aggreg))
				{
					aggreg[label]={}
					for (attr in current[label])
						{
							aggreg[label][attr]=0
						}
				}

			for (attr in current[label])
				{
					aggreg[label][attr]= aggreg[label][attr] + current[label][attr]
				}

		}

		return aggreg
	}

/*@output - is the label in the separate format (intent, attribute, value), observable - tree of the labels
output - list of the ambiguities for intents and labels.*/
module.exports.intent_attr_label_ambiguity = function(output)
	{
	Observable = labeltree
	ambiguity = []
	_.each(output[1], function(attr, key, list){
			listt = []
			_.each(output[0], function(intent, key, list){
				if (Object.keys(Observable[intent]).indexOf(attr) != -1)
					{
					listt.push(intent)
					} 
				}, this)
			// console.log(listt)
			if (listt.length >= 2)
				{
					amb = {}
					amb['attr'] = attr
					amb['list'] = listt
					ambiguity.push(amb)
				}
			}, this)
	return ambiguity
	}

/*the same as previous but for the dataset
*/module.exports.intent_attr_dataset_ambiguity = function(data)
	{

	Observable = labeltree
	ambiguityset = []
	_.each(data, function(value, key, list){ 
			output = (splitPartEqually(multilabelutils.normalizeOutputLabels(value.output)))
			ambig = this.intent_attr_label_ambiguity(output)
			if (ambig.length != 0)
			ambiguityset.push({'input': value['input'],
							'output': value['output'],
							'conversion': output,
							'ambiguity':ambig})
		}, this)

	return ambiguityset
}

/*testSet - dataset
output - clone of the dataset*/
module.exports.clonedataset = function(set)
{
	set1 = []
	_.each(set, function(value, key, list){
		set1.push(_.clone(value))
		})
	return set1
}

function Compensate(json) {
		// console.log(json)
	js = splitJson(json)
	if ((js.length == 2) && (js[1].toString()[0] != js[1].toString()[0].toUpperCase()))
		{
		js.push(js[1])
		js[1] = ""
		}
	return js
}


function splitJson(json) {
	return splitJsonRecursive(_.isString(json) && /{.*}/.test(json)?
		JSON.parse(json):
		json);
}
 
function splitJsonRecursive(json) {
	if (!_.isObject(json))
		return [json];
	var firstKey = Object.keys(json)[0];
	var rest = splitJsonRecursive(json[firstKey]);
	rest.unshift(firstKey);
	return rest;
}

function splitPartEqually(json) {	
	label = []	
	_(3).times(function(n){
		buf = []
		_.each(json.map(Compensate), function(value, key, list){
			if (value.length>n)
			{
			if (_.compact(value[n].toString()).length != 0)
				buf = buf.concat(value[n])
			}
		})

		buf = _.uniq(buf)

		if ((buf.length > 0) && (typeof(buf[0])!="undefined"))
			label[n] = buf
		if ((typeof(buf[0])=="undefined"))
			label[n] = []
	})
	return label
}