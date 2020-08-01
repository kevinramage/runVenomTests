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
		const venomLogLevel = core.getInput("venom_log");
		const venomEnvVars = core.getInput("venom_environment");
		const venomVars = core.getInput("venom_variable");
		const venomExclude = core.getInput("venom_exclude");
		const venomFormat = core.getInput("venom_format");

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
		var cmdLine = util.format("./venom run --parallel %d --output-dir %s --log %s", venomParallel, venomOutputDirectory, venomLogLevel);
		if ( venomEnvVars != "" ) {
			cmdLine = util.format("%s --env %s", cmdLine, venomEnvVars);
		}
		if ( venomVars != "" ) {
			cmdLine = util.format("%s --var %s", cmdLine, venomVars);
		}
		if ( venomExclude != "" ) {
			cmdLine = util.format("%s --exclude %s", cmdLine, venomExclude);
		}
		cmdLine = util.format("%s --format %s %s", cmdLine, venomFormat, venomPath);
		if ( workingDirectory != "" && workingDirectory != "." ) {
			await exec.exec(cmdLine, "", { cwd: workingDirectory});
		} else {
			await exec.exec(cmdLine, "");
		}

		// Artifact the result
		console.info("Artifact results");
		if ( artifactName != "" ) {
			const currentDirectory = process.cwd();
			if ( workingDirectory != "" && workingDirectory != ".") {
				const rootDirectory = path.join(currentDirectory, workingDirectory);
				const file = path.join(rootDirectory, "test_results.xml");
				await artifact.create().uploadArtifact(artifactName, [file], rootDirectory);
			} else {
				const file = path.join(currentDirectory, "test_results.xml");
				await artifact.create().uploadArtifact(artifactName, [file], currentDirectory);
			}
		}

		// Change the status of the job
		console.info("Change status");
		await exec.exec("cat test_results.xml", "", { cwd: workingDirectory });
		const statusCommandLine = util.format("cat %s | grep \"<failure>\"", "test_results.xml");
		var returnCode;
		if ( workingDirectory != "" && workingDirectory != "." ) {
			returnCode = await exec.exec(statusCommandLine, "", { cwd: workingDirectory});
		} else {
			returnCode = await exec.exec(statusCommandLine, "");
		}
		if ( returnCode != 0 ) {
			core.setFailed("Tests failed")
		}

	} catch (error) {
		core.setFailed(error.message);
	}
}

main();