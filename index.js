const util = require("util");
const path = require("path");
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const artifact = require("@actions/artifact");
const io = require("@actions/io");

async function main() {
	try {

		// Get variables
		const artifactName = core.getInput("artifactName");
		const venomRelease = core.getInput("venom_release");
		const venomPath = core.getInput("venom_path");
		const venomParallel = core.getInput("venom_parallel");
		const venomOutputDirectory = core.getInput("venom_outputdir");

		// Change workdir
		await exec.exec("pwd");
		await exec.exec("cd src");
		await exec.exec("pwd");

		// Download venom
		console.info("Download venom");
		await tc.downloadTool(venomRelease, "venom");

		// Add right to venom binary
		console.info("Add right to venom binary");
		await exec.exec("chmod +x venom");

		// Build the venom command line
		console.info("Run venom command");
		var cmdLine = util.format("./venom run --parallel %d --output-dir %s %s", venomParallel, venomOutputDirectory, venomPath);
		await exec.exec(cmdLine);

		// Identify artifact name
		var artifactPath = "test_results.xml";

		// Artifact the result
		console.info("Artifact result");
		if ( artifactName != "" ) {
			artifact.create().uploadArtifact(artifactName, [artifactPath])
		}

		// Change the status of the job
		console.info("Change status");
		const statusCommandLine = util.format("cat %s | grep \"<failure>\" | wc -l", artifactPath);
		const returnCode = await exec.exec(statusCommandLine);
		if ( returnCode != 0 ) {
			core.setFailed("Tests failed")
		}

	} catch (error) {
		core.setFailed(error.message);
	}
}

main();