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
		const workingDirectory = core.getInput("workingDirectory");
		const artifactName = core.getInput("artifactName");
		const venomRelease = core.getInput("venom_release");
		const venomPath = core.getInput("venom_path");
		const venomParallel = core.getInput("venom_parallel");
		const venomOutputDirectory = core.getInput("venom_outputdir");

		// Download venom
		console.info("Download venom");
		await tc.downloadTool(venomRelease, "venom");

		// Add right to venom binary
		console.info("Add right to venom binary");
		await exec.exec("chmod +x venom");

		// Move venom binary
		if ( workingDirectory != "" && workingDirectory != ".") {
			await io.mv("venom", path.join(workingDirectory, "venom"));
		}

		// Build the venom command line
		console.info("Run venom command");
		var cmdLine = util.format("./venom run --parallel %d --output-dir %s %s", venomParallel, venomOutputDirectory, venomPath);
		if ( workingDirectory != "" && workingDirectory != "." ) {
			await exec.exec(cmdLine, "", { cwd: workingDirectory});
		} else {
			await exec.exec(cmdLine, "");
		}

		// Identify artifact name
		console.info("Identify artifact name");
		var artifactPath = "test_results.xml";
		if ( workingDirectory != "" && workingDirectory != "." ) {
			artifactPath = path.join(workingDirectory, artifactPath);
		}
		console.info("- Artifact path: " + artifactPath);

		// Artifact the result
		console.info("Artifact results");
		if ( artifactName != "" ) {
			if ( workingDirectory != "" && workingDirectory != ".") {
				await artifact.create().uploadArtifact(artifactName, ["test_results.xml"], workingDirectory)
			} else {
				await artifact.create().uploadArtifact(artifactName, ["test_results.xml"], "")
			}
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