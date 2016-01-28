![GitPie](https://raw.githubusercontent.com/git-pie/GitPie/master/resources/images/gitpie-banner.png)

![dependencies](https://david-dm.org/git-pie/GitPie.svg) ![devdependecies](https://david-dm.org/git-pie/GitPie/dev-status.svg?style=flat)

GitPie is a Multiplataform Client for [Git](https://git-scm.com/) that have the goal to be a simple and elegant solution to manage any git project don't matter what git service you use. And the best is 100% open source.

## Warning
The pie is extremely hot! Eating it can hurt!

GitPie is under hard development. And can have a lot of bug and unterminated capabilities. Please go easy and be gentle.

## What's in the pie stuffing?

GitPie is built on [Electron](https://github.com/atom/electron) and [Angular](https://github.com/angular/angular) to have a maintainable and organized source to anyone understand what's going on behind the scenes.

## What's the taste of GitPie?

With GitPie you can:

- Add any Git repository
- Clone any Git repository
- Create a git repository from zero
- Visualize the commit history
- Visualize the number of commits
- Visualize changes per commit
- Visualize changes in files
- Add files to commit
- Commit changes
- Pull changes *(An ssh key needs to be configured properly)*
- Push changes *(An ssh key needs to be configured properly)*
- Create new branchs
- Switch between branchs
- Visualize repository tags
- Stash changes
- Pop a Stash
- Remove a Stash
- Visualize files in a Stash
- Revert a repository to a specific commit

## Installing

### Linux

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie [release page](https://github.com/git-pie/GitPie/releases).

### OS X

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie [release page](https://github.com/git-pie/GitPie/releases).

### Windows

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie [release page](https://github.com/git-pie/GitPie/releases).

## Contributing
Want to contribute with the project? This is awesome. But before doing that we prepare a recipe to you do it the right way.

- All contributions must adhere to the [Idiomatic.js Style Guide](https://github.com/rwaldron/idiomatic.js), by maintaining the existing coding style.

- Discuss the changes before doing them. Open a issue in the bug tracker describing the contribution you'd like to make, the bug you found or any other ideas you have.

- Fork the project and submit your changes by a Pull Request

- Be the most creative as possible.

If you want to make changes in the style of the application, you need to convert the sass code into css. For this execute:

```bash
npm run dev
```

## Building

Just execute the following commands to build the project from source:

Prerequisites
- wine (*Required only if you're on OSX or Linux*)

```bash
git clone https://github.com/git-pie/GitPie.git
cd GitPie
npm install
npm build # This will build binaries for the all supported platforms: `linux`, `osx` and `windows`
```

If you want build to a specific platform, just execute one of the following commands:

```sh
npm run linux32
npm run linux64
npm run osx64
npm run win32
npm run win64

# You can just build the binaries

npm run build:linux32
npm run build:linux64
npm run build:osx64
npm run build:win32
npm run build:win64
```

## Packing
The following tasks will create a installer for Windows, a `.dmg` file for OS X, a `.deb` and `.rmp` file for linux and compressed files with the binaries for each platform.

Prerequisites
- zip
- makensis [See how install it](https://github.com/loopline-systems/electron-builder#pre-requisites)
- wine (*Required only if you're on OSX or Linux*)

*The following  programs are required only if you want to build .deb and .rpm packages*

- dpkg-deb
- alien

```sh
npm run pack # This will pack the application for the all supported platforms: `linux`, `osx` and `windows`
npm run pack:linux32
npm run pack:linux64
npm run pack:osx64
npm run pack:win32
npm run pack:win64
```

## License
Copyright (c) 2015 Matheus Paiva (MIT) The MIT License
