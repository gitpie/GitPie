# GitPie
GitPie is a Multiplataform Client for [Git](https://git-scm.com/) that have the goal to be a simple and elegant solution to manage any git project don't matter what git service you use. And the best is 100% open source.

## Warning
The pie is extremely hot! Eat it can hurt!

GitPie is under hard development. And can have a lot of bug and unterminated capabilities. Please go easy and be gentle.

## What's in the pie stuffing?

GitPie is built on [NW.js](https://github.com/nwjs/nw.js) and [Angular](https://github.com/nwjs/nw.js) to have a maintainable and organized source to anyone understand what's going on behind the scenes.

## What's the taste of GitPie?

With GitPie you can:

- Add any Git repository
- Visualize the commit history
- Visualize the number of commits
- Visualize changes per commit
- Visualize changes in files (Not from a beauty way yet :/)
- Add files to commit
- Commit changes
- Pull changes (Only for public projects yet :/)

## Installing

### Linux

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie release page.

### OS X

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie release page.

### Windows

Available on 32-bit and 64-bit.

Download the latest Pie from the GitPie release page.

## Contributing
Want to contribute with the project? This is awesome. But before doing that we prepare a recipe to you do it the right way.

- All contributions must adhere to the [Idiomatic.js Style Guide](https://github.com/rwaldron/idiomatic.js), by maintaining the existing coding style.

- Discuss the changes before doing them. Open a issue in the bug tracker describing the contribution you'd like to make, the bug you found or any other ideas you have.

- Fork the project and submit your changes by a Pull Request

- Be the most creative as possible.

## Building

Just execute the follow commands to build the project from source:

```bash
git clone https://github.com/mapaiva/GitPie.git
cd GitPie
npm install
npm install -g grunt-cli
grunt build
```

If you want to make changes in the style of the application, you need to run the dev grunt task that will convert your sass changes into css. For this execute:

```bash
grunt dev
```

## License
Copyright (c) 2015 Matheus Paiva (MIT) The MIT License
