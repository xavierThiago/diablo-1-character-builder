var DiabloBuildMaker = (function () {
    "use strict";

    const WARRIOR_CLASS_KEY = "warrior";
    const ROGUE_CLASS_KEY = "rogue";
    const SORCERER_CLASS_KEY = "sorcerer";

    const STRENGTH_ATTRIBUTE_KEY = "strength";
    const MAGIC_ATTRIBUTE_KEY = "magic";
    const DEXTERITY_ATTRIBUTE_KEY = "dexterity";
    const VITALITY_ATTRIBUTE_KEY = "vitality";

    const NORMAL_STRATEGY_KEY = "normal";
    const AFFINITY_STRATEGY_KEY = "affinity";
    const RANDOM_STRATEGY_KEY = "random";

    const defaults = {
        roundingYielding: false,
        rounding: {
            strategy: {
                normal: NORMAL_STRATEGY_KEY,
                affinity: AFFINITY_STRATEGY_KEY,
                random: RANDOM_STRATEGY_KEY
            }
        }
    };

    function isObject(target) {
        if (!target) {
            return false;
        }

        const type = typeof target;

        return (type === "function" || type === "object");
    };

    function validateCharacterAttributes(attributes) {
        if (isObject(attributes) && attributes.hasOwnProperty(STRENGTH_ATTRIBUTE_KEY) &&
            attributes.hasOwnProperty(MAGIC_ATTRIBUTE_KEY) && attributes.hasOwnProperty(DEXTERITY_ATTRIBUTE_KEY) &&
            attributes.hasOwnProperty(VITALITY_ATTRIBUTE_KEY) && !isNaN(attributes.strength) && !isNaN(attributes.magic) &&
            !isNaN(attributes.dexterity) && !isNaN(attributes.vitality)) {

            if (attributes.strength > 0 && attributes.magic > 0 && attributes.dexterity > 0 && attributes.vitality > 0) {
                return true;
            } else {
                throw new Error("Can not create a character build with 0, or less, values.");
            }
        }

        return false;
    }

    function sumAttributes(attribute) {
        return Object.values(attribute).reduce((first, second) => {
            return first + second;
        });
    }

    function calculateBuildProportion(attribute) {
        const sum = sumAttributes(attribute);

        if (sum > 0) {
            return {
                sum: sum,
                proportion: {
                    strength: attribute.strength / sum,
                    magic: attribute.magic / sum,
                    dexterity: attribute.dexterity / sum,
                    vitality: attribute.vitality / sum
                }
            };
        }

        return null;
    }

    function createCharacterBuild(character) {
        if (isObject(character) && character.hasOwnProperty("proportion") && character.hasOwnProperty("attribute") &&
            character.hasOwnProperty("status") && isObject(character.status) && character.status.hasOwnProperty("affinity") &&
            character.status.hasOwnProperty("deficiency") && typeof character.status.affinity === "string" &&
            typeof character.status.deficiency === "string" && validateCharacterAttributes(character.attribute)) {

            let math;

            if (character.proportion) {
                math = {
                    sum: sumAttributes(character.attribute),
                    proportion: character.proportion
                };
            } else {
                math = calculateBuildProportion(character.attribute);
            }

            return {
                status: character.status,
                attribute: character.attribute,
                math: math
            };
        }

        return null;
    }

    function validateCharacterBuild(build) {
        if (isObject(build) && build.hasOwnProperty("sum") &&
            build.hasOwnProperty("proportion") && validateCharacterAttributes(build.proportion) &&
            build.hasOwnProperty("attribute") && isObject(build.attribute) &&
            validateCharacterAttributes(build.attribute) && build.hasOwnProperty("prevailing") &&
            typeof build.prevailing === "string") {

            return build.proportion.strength > 0 && build.proportion.magic > 0 &&
                build.proportion.dexterity > 0 && build.proportion.vitality > 0;
        }
    }

    function calculatePoints(build) {
        // TODO: fix rounding problem.
        build.attribute.strength += Math.round(proportionToAttributeMap.strength);
        build.attribute.magic += Math.round(proportionToAttributeMap.magic);
        build.attribute.dexterity += Math.round(proportionToAttributeMap.dexterity);
        build.attribute.vitality += Math.round(proportionToAttributeMap.vitality);
    }

    function calculatePointsByAffinityRounding(build, proportionToAttributeMap) {
        let sum = 0;

        if (build.prevailing !== STRENGTH_ATTRIBUTE_KEY) {
            let strengthFloored = Math.floor(proportionToAttributeMap.strength);
            let strengthDiff = (strengthFloored + 1) % proportionToAttributeMap.strength;

            if (strengthDiff < 0.5) {
                build.attribute.strength += strengthFloored;
                sum += 1;
            } else {
                build.attribute.strength += Math.round(proportionToAttributeMap.strength);
            }
        }

        if (build.prevailing !== MAGIC_ATTRIBUTE_KEY) {
            let magicFloored = Math.floor(proportionToAttributeMap.magic);
            let magicDiff = (magicFloored + 1) % proportionToAttributeMap.magic;

            if (magicDiff < 0.5) {
                build.attribute.magic += magicFloored;
                sum += 1;
            } else {
                build.attribute.magic += Math.round(proportionToAttributeMap.magic);
            }
        }

        if (build.prevailing !== DEXTERITY_ATTRIBUTE_KEY) {
            let dexterityFloored = Math.floor(proportionToAttributeMap.dexterity);
            let dexterityDiff = (dexterityFloored + 1) % proportionToAttributeMap.dexterity;

            if (dexterityDiff < 0.5) {
                build.attribute.dexterity += dexterityFloored;
                sum += 1;
            } else {
                build.attribute.dexterity += Math.round(proportionToAttributeMap.dexterity);
            }
        }

        if (build.prevailing !== VITALITY_ATTRIBUTE_KEY) {
            let vitalityFloored = Math.floor(proportionToAttributeMap.vitality);
            let vitalityDiff = (vitalityFloored + 1) % proportionToAttributeMap.vitality;

            if (vitalityDiff < 0.5) {
                build.attribute.vitality += vitalityFloored;
                sum += 1;
            } else {
                build.attribute.vitality += Math.round(proportionToAttributeMap.vitality);
            }
        }

        build.attribute[build.prevailing] += Math.floor(proportionToAttributeMap[build.prevailing]) + sum/* Math.ceil(sum) */;
    }

    function calculatePointsByRandomRounding(build, proportionToAttributeMap) {
        if (build) {
            const keys = Object.keys(build.attribute).filter((value) => { return value !== build.status.affinity; });
            const randomDeficientAttribute = keys[parseInt(Math.random() * keys.length, 10)];

            if (randomDeficientAttribute) {
                // calculatePointsByAffinityRounding(build, proportionToAttributeMap);

                return {
                    strength: 30,
                    magic: 10,
                    dexterity: 20,
                    vitality: 25
                };
            }
        }

        return null;
    }

    function figureOutRoundingDiff(number) {
        if (number && !isNaN(number)) {
            /* let mod = (number % 2);

            mod = foo >= 1 && foo < 2 ? (number % 3) : foo;

            return ((number - mod) + 1) - number; */

            return (Math.floor(number) + 1) - number;
        }

        return 0;
    }

    function advanceWith(points, build, type) {
        if (points && build && !isNaN(points) && isObject(type) &&
            type.hasOwnProperty("strategy") && typeof type.strategy === "string" &&
            defaults.rounding.strategy.hasOwnProperty(type.strategy)) {

            const pointsConverted = parseInt(points, 10);

            if (pointsConverted >= 5) {
                let attrs = {};
                let attrToNormalize = {};
                let affinityAttributeResult = build.math.proportion[build.status.affinity] * pointsConverted;

                Object.keys(build.math.proportion).filter(x => x !== build.status.affinity).forEach((key, i) => {
                    const result = build.math.proportion[key] * pointsConverted;
                    const roundingDiff = figureOutRoundingDiff(result);

                    if (roundingDiff < 0.5) {
                        attrToNormalize[key] = true;
                    } else {
                        attrToNormalize[key] = false;
                    }

                    attrs[key] = result;
                });

                attrs[build.status.affinity] = affinityAttributeResult;

                debugger;

                if (type.strategy === defaults.rounding.strategy.normal) {
                    /*                     let attrs = Object.keys(resultToAttributeMap).filter(x => x !== build.status.affinity).map((key, i) => {
                                            return resultToAttributeMap[key];
                                        }); */

                    // calculatePoints(build);
                } else if (type.strategy === defaults.rounding.strategy.affinity) {
                    let remainder = Object.keys(attrToNormalize).length;
                    const keys = Object.keys(attrs);

                    keys.forEach((key) => {
                        if (attrToNormalize[key]) {
                            build.attribute[key] = Math.floor(attrs[key]);
                        } else {
                            build.attribute[key] = Math.round(attrs[key]);
                        }
                    });

                    build.attribute[build.status.affinity] += remainder;

                    // if (sumAttributes(build.attribute) !== remainder) {
                    //     build.attribute[build.status.affinity]
                    // }

                    // calculatePointsByAffinityRounding(build, resultToAttributeMap);
                } else if (type.strategy === defaults.rounding.strategy.random) {
                    // calculatePointsByRandomRounding(affinityAttributeResult, otherAttributesResultMap);
                }

                return build;
            } else {
                throw new RangeError("Invalid minimum number of points.");
            }
        }
    }

    function makeWarrior(options) {
        /*
            Max attributes:
                strength: 250,
                magic: 50,
                dexterity: 60,
                vitality: 100
        */

        const build = createCharacterBuild({
            status: {
                affinity: STRENGTH_ATTRIBUTE_KEY,
                deficiency: MAGIC_ATTRIBUTE_KEY
            },
            attribute: {
                strength: 30,
                magic: 10,
                dexterity: 20,
                vitality: 25
            },
            proportion: options.proportion
        });

        return {
            advance: (() => {

                return (points) => {
                    return advanceWith(points, build, {
                        strategy: options.rounding.strategy
                    });
                };

            })(),
            history: () => { }
        };
    }

    function makeRogue(options) {
        /*
            Max attributes:
                strength: 55,
                magic: 70,
                dexterity: 250,
                vitality: 80
        */

        let build = createCharacterBuild({
            status: {
                affinity: DEXTERITY_ATTRIBUTE_KEY,
                deficiency: VITALITY_ATTRIBUTE_KEY
            },
            attribute: {
                strength: 20,
                magic: 15,
                dexterity: 30,
                vitality: 20
            },
            proportion: options.proportion
        });

        return {
            advance: (() => {

                return (points) => {
                    return advanceWith(points, build, options);
                };

            })(),
            history: () => { }
        };
    }

    function makeSorcerer(options) {
        /*
            Max attributes:
                strength: 45,
                magic: 250,
                dexterity: 85,
                vitality: 80
        */

        let build = createCharacterBuild({
            status: {
                affinity: MAGIC_ATTRIBUTE_KEY,
                deficiency: STRENGTH_ATTRIBUTE_KEY
            },
            attribute: {
                strength: 15,
                magic: 35,
                dexterity: 15,
                vitality: 20
            },
            proportion: options.proportion
        });

        return {
            advance: (() => {

                return (points) => {
                    return advanceWith(points, build, options);
                };

            })(),
            history: () => { }
        };
    }

    function normalizeOptions(options) {
        let result = {
            proportion: null,
            rounding: {
                strategy: NORMAL_STRATEGY_KEY
            }
        };

        if (isObject(options)) {
            if (options.hasOwnProperty("strategy") && typeof options.strategy === "string" &&
                defaults.rounding.strategy.hasOwnProperty(options.strategy)) {

                console.info(`[Options: strategy] => Math rounding strategy set to '${options.strategy}'.`);

                result.rounding.strategy = options.strategy;
            }

            if (options.hasOwnProperty("proportion") && validateCharacterAttributes(options.proportion)) {
                console.info("[Options: proportion] => Character build will distribute points with given attribute's proportion.");

                result.proportion = {
                    strength: options.proportion.strength /= 100,
                    magic: options.proportion.magic /= 100,
                    dexterity: options.proportion.dexterity /= 100,
                    vitality: options.proportion.vitality /= 100
                };
            }
        }

        return result;
    }

    function build(type, options) {
        if (type) {
            const verifiedOptions = normalizeOptions(options);

            if (type === WARRIOR_CLASS_KEY) {
                return makeWarrior(verifiedOptions);
            } else if (type === ROGUE_CLASS_KEY) {
                return makeRogue(verifiedOptions);
            } else if (type === SORCERER_CLASS_KEY) {
                return makeSorcerer(verifiedOptions);
            }
        } else {
            throw new SyntaxError("Character class not supported.");
        }
    }

    return {
        build: build,
        strategies: [
            NORMAL_STRATEGY_KEY,
            AFFINITY_STRATEGY_KEY,
            RANDOM_STRATEGY_KEY
        ]
    };
}());
