const xlsx = require("node-xlsx").default;
const Normalizer = require("./normalizer").Normalizer;
const source = xlsx.parse("./data.xlsx");
const Architect = require("synaptic").Architect;
const Trainer = require("synaptic").Trainer;

// Read the XLSX file into memory
const keys = source[0].data[0];
const data = source[0].data.slice(1).map((row) => {
	let temp = {};
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] == "gewogen_gemiddelde") {
			continue;
		}

		temp[keys[i]] = row[i];
		if (!row[i] && row[i] !== 0) {
			console.log(`Row ${i} key ${keys[i]} is ${row[i]}`);
		}
	}
	return temp;
});

// Split the data into training data and test data
const trainingData = data.slice(0, 245);
const testData = data.slice(245);

// Normalize the data so that the neural network can work with it
const normalizer = new Normalizer(trainingData);
normalizer.setOutputProperties(["positief_advies", "twijfel_advies", "negatief_advies"]);
normalizer.normalize();

const inputAmount = normalizer.getInputLength();
const outputAmount = normalizer.getOutputLength();
const metadata = normalizer.getDatasetMetaData();

const inputs = normalizer.getBinaryInputDataset();
const outputs = normalizer.getBinaryOutputDataset();

// Create the network
const network = new Architect.Perceptron(inputAmount, Math.floor(inputAmount * 1.5), outputAmount);
const trainer = new Trainer(network);

// Prepare the input set for the trainer
const normalizedTrainingSet = [];
for (let i in inputs) {
	normalizedTrainingSet.push({
		input: inputs[i],
		output: outputs[i],
	});
}

// Train the network
console.log("Training the network, might take some time");
console.log(trainer.train(normalizedTrainingSet, {
	rate: 0.1,
	iterations: 20000,
	error: 0.005,
	shuffle: true,
	log: 10
}));

// Normalize the test set
const testNormalizer = new Normalizer(testData);
testNormalizer.setDatasetMetaData(metadata);
testNormalizer.setOutputProperties(["positief_advies", "twijfel_advies", "negatief_advies"]);
testNormalizer.normalize();

const testInputAmount = testNormalizer.getInputLength();
const testOutputAmount = testNormalizer.getOutputLength();

const testInputs = testNormalizer.getBinaryInputDataset();
const testOutputs = testNormalizer.getBinaryOutputDataset();

for (var i = 0; i < testInputs.length; i++) {
	console.log(`Test ${i + 1}, should be: ${testOutputs[i]} | Output: ${network.activate(testInputs[i]).map(v => (Math.round(v * 100) / 100))}`);
}