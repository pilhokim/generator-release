'use strict';
var fs = require('fs'),
    dateFormat = require('dateformat'),
    git = require('../lib/git'),
    path = require('path'),
    util = require('util'),
    semver = require('semver'),
    yeoman = require('yeoman-generator');

var ReleaseNotesGenerator = module.exports = function ReleaseNotesGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  this.date = dateFormat(new Date(), 'mmmm dS, yyyy');

  this.option('dry-run', {
    desc: 'Finds the changes that will be recorded and log to the console rather than disk',
    type: 'Boolean'
  });
  this.dryRun = options['dry-run'];

  if (!this.dryRun) {
    this.argument('increment', {desc: 'Increment type. May be one of {major, minor, patch, prerelease}', required: true});

    if (this.increment !== 'major' && this.increment !== 'minor' && this.increment !== 'patch' && this.increment !== 'prerelease') {
      throw new Error('"' + this.increment + '" must be one of {major, minor, patch, prerelease}');
    }
  }
};

util.inherits(ReleaseNotesGenerator, yeoman.generators.Base);

ReleaseNotesGenerator.prototype.ensureClean = git.ensureClean;
ReleaseNotesGenerator.prototype.ensureFetched = git.ensureFetched;

ReleaseNotesGenerator.prototype.readVersions = function() {
  var config;
  try {
    config = JSON.parse(fs.readFileSync('bower.json'));
  } catch (err) {
    config = JSON.parse(fs.readFileSync('package.json'));
  }

  this.priorVersion = 'v' + config.version;
  this.version = 'v' + semver.inc(this.priorVersion, this.increment || 'patch');
};

ReleaseNotesGenerator.prototype.loadNotes = function() {
  try {
    this.existing = fs.readFileSync('RELEASE.md');
    this.notesName = 'RELEASE.md';
  } catch (err) {
    try {
      this.existing = fs.readFileSync('release-notes.md');
      this.notesName = 'release-notes.md';
    } catch (err) {
      try {
        this.existing = fs.readFileSync('CHANGELOG.md');
        this.notesName = 'CHANGELOG.md';
      } catch (err) {
        this.notesName = 'release-notes.md';
      }
    }
  }

  if (this.existing) {
    this.existing = this.existing.toString();
    this.firstCommit = this.priorVersion;
  }
};

ReleaseNotesGenerator.prototype.originName = git.originName;
ReleaseNotesGenerator.prototype.findFirstCommit = git.findFirstCommit;
ReleaseNotesGenerator.prototype.commitTime = git.commitTime;
ReleaseNotesGenerator.prototype.findChanges = git.findChanges;

ReleaseNotesGenerator.prototype.updateNotes = function() {
  if (this.dryRun) {
    this.log.write(this.engine(this.read('_version.md'), this));
    return;
  }

  var notes = this.existing;
  if (!notes) {
    notes = this.engine(this.read('_release-notes.md'), this);
  }

  notes = notes.replace(/\.\.\.master/, '...' + this.version);
  notes = notes.replace(/## Development\n/, '## Development\n' + this.engine(this.read('_version.md'), this));
  fs.writeFileSync(this.notesName, notes);
};

ReleaseNotesGenerator.prototype.notes = function() {
  if (!this.dryRun) {
    console.log(this.notesName + ' updated with latest release notes. Please review and commit prior to final release.');
  }
};
