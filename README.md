# niivue-desktop

This is the desktop app that builds on the core [NiiVue](https://github.com/niivue/niivue) WebGL 2.0 medical image viewer. 

# Development and Building

1. `git clone --recurse-submodules git@github.com:niivue/niivue-desktop.git`
2. `cd niivue-desktop`
3. `npm install`

## Run app in Dev mode

note that the electron code does not offer hot reload. Hot reload only applies to the UI if you make changes to those files while the app is running. 

```
# You MUST supply the path to the niivue library on your system
# for example if you cloned niivue to ~/github/niivue/niivue
export NIIVUE_PATH=$HOME/github/niivue/niivue; npm run dev
```

## Package app

does not zip for distribution, just makes an app that can be run outside of dev mode

```
# You MUST supply the path to the niivue library on your system
# for example if you cloned niivue to ~/github/niivue/niivue
export NIIVUE_PATH=$HOME/github/niivue/niivue; npm run package
```

## Package and bundle

creates a zip to share

```
# You MUST supply the path to the niivue library on your system
# for example if you cloned niivue to ~/github/niivue/niivue
export NIIVUE_PATH=$HOME/github/niivue/niivue; npm run make
``` 