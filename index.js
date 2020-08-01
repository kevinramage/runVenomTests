const util = require("util");
const path = require("path");
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const artifact = require("@actions/artifact");
const fs = require("fs");
const io = require("@actions/io");

class VenomRunner {

	init() {
		this.workingDirectory = core.getInput("workingDirectory");
		this.artifactName = core.getInput("artifactName");
		this.venomRelease = core.getInput("venom_release");
		this.venomPath = core.getInput("venom_path");
		this.venomParallel = core.getInput("venom_parallel");
		this.venomOutputDirectory = core.getInput("venom_outputdir");
		this.venomLogLevel = core.getInput("venom_log");
		this.venomEnvVars = core.getInput("venom_environment");
		this.venomVars = core.getInput("venom_variable");
		this.venomExclude = core.getInput("venom_exclude");
		this.venomFormat = core.getInput("venom_format");
		this.venomStopOnFailure = core.getInput("venomStopOnFailure");
		this.venomStrict = core.getInput("venomStrict");
	}

	async downloadVenom() {
		console.info("Download venom");
		await tc.downloadTool(this.venomRelease, "venom");
		await exec.exec("chmod +x venom");
		if ( this.workingDirectory != "" && this.workingDirectory != ".") {
			await io.mv("venom", path.join(this.workingDirectory, "venom"));
		}
	}

	async executeVenom() {
		console.info("Run venom command");
		const cmdLine = this.generateVenomCmdLine();

		if ( this.workingDirectory != "" && this.workingDirectory != "." ) {
			await exec.exec(cmdLine, "", { cwd: this.workingDirectory});
		} else {
			await exec.exec(cmdLine, "");
		}
	}

	generateVenomCmdLine() {
		var cmdLine = util.format("./venom run --parallel %d --output-dir %s --log %s", this.venomParallel, this.venomOutputDirectory, this.venomLogLevel);

		if ( this.venomEnvVars != "" ) {
			cmdLine = util.format("%s --env %s", cmdLine, this.venomEnvVars);
		}
		if ( this.venomVars != "" ) {
			cmdLine = util.format("%s --var %s", cmdLine, this.venomVars);
		}
		if ( this.venomExclude != "" ) {
			cmdLine = util.format("%s --exclude %s", cmdLine, this.venomExclude);
		}
		if ( this.venomStopOnFailure == "true" ) {
			cmdLine = util.format("%s --stop-on-failure", cmdLine);
		}
		if ( this.venomStrict == "true" ) {
			cmdLine = util.format("%s --strict", cmdLine);
		}
		cmdLine = util.format("%s --format %s %s", cmdLine, this.venomFormat, this.venomPath);

		return cmdLine;
	}

	async artifactResults() {
		console.info("Artifact results");
		if ( this.artifactName != "" ) {
			const currentDirectory = process.cwd();
			if ( this.workingDirectory != "" && this.workingDirectory != ".") {
				const rootDirectory = path.join(currentDirectory, this.workingDirectory);
				const file = path.join(rootDirectory, "test_results.xml");
				await artifact.create().uploadArtifact(this.artifactName, [file], rootDirectory);
			} else {
				const file = path.join(currentDirectory, "test_results.xml");
				await artifact.create().uploadArtifact(this.artifactName, [file], currentDirectory);
			}
		}
	}

	async changeStatus() {
		console.info("Change status");

		// Read file
		var filePath;
		if ( this.workingDirectory != "" && this.workingDirectory != "." ) {
			filePath = path.join(this.workingDirectory, "test_results.xml");
		} else {
			filePath = "test_results.xml";
		}
		const buffer = fs.readFileSync(filePath);
		const output = buffer.toString();
		
		/*
		// Prepare listener
		var output = "";
		const options = {};
		options.listeners = {
		  stdout: (data) => {
			output += data.toString();
		  }
		};

		// Get the result
		if ( this.workingDirectory != "" && this.workingDirectory != "." ) {
			await exec.exec("cat test_results.xml", "", { cwd: this.workingDirectory});
		} else {
			await exec.exec("cat test_results.xml", "");
		}
		*/

		// Check the presence of failure tag
		if ( output.includes("<failure>") ) {
			core.setFailed("Tests failed")
		}
	}

	async execute() {
		try {
			this.init();
			await this.downloadVenom();
			await this.executeVenom();
			await this.artifactResults();
			await this.changeStatus();
		} catch (error) {
			core.setFailed(error.message);
		}
	}
}

new VenomRunner().execute();