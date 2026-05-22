# Corpus v1 Manifest

## Overview

This document declares the frozen baseline stress scene corpus for NEW3 CSS native layout experiments. Corpus v1 represents a stable reference point against which all future batches (Batch 5+) will be compared.

Frozen date: 2026-05-21

## Corpus Identifier

- **Corpus version**: v1
- **Frozen date**: 2026-05-21
- **Generator commit**: 4d03b4ba5265bd8118ea15f915aba214bf61f376
- **Generator file hash (sha256)**: 2dafbc09fdd9ea3db89d11c6cf090d24edd7b2d978d6da3560fe5aa4677733b0
- **Generator path**: `experiments/css_native_layout/stress_generators/generate_stress_scenes.py`
- **Random seed**: 42 (pinned for reproducibility)
- **Scene count**: 100

## Regeneration Command

To regenerate the identical Corpus v1 set, use:

```bash
source source_me.sh && python3 experiments/css_native_layout/stress_generators/generate_stress_scenes.py --seed 42
```

This command pins the global RNG seed to 42, ensuring byte-identical YAML output across runs and machines.

## Scene Manifest

All 100 stress scene YAMLs generated for Corpus v1, with SHA256 hashes:

| Filename                               | SHA256                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| stress_composition_001.yaml            | 5d52fa51f293d37e8921891e62f2e83584d09ad30ed593723b675e98b09446f4 |
| stress_composition_002.yaml            | 13829f48a3f4aca4e542203b21577a2cf81b1d1011dff4a41f369ee2ea0d2039 |
| stress_composition_003.yaml            | 753d546fa55ce77befb98e7d145b2b01e0d32b900711f43db2dc73a92aa00fe4 |
| stress_composition_004.yaml            | 353f6fb9cd5d0fc5d19368e7b785253ac23ad8b884fe767c119007947196bfd2 |
| stress_composition_005.yaml            | c331a7c293fb60cf9609e76dfaa62df072995bf7d923e8feaf6817da1680afa9 |
| stress_composition_006.yaml            | cef51f6f757b38821c554103aecea829ef3ffa55a427811d31c35dca674c17b7 |
| stress_composition_007.yaml            | d7fa87e0612458f293125c25f5a39ca62a29bb9f1482e5154fd7ee40b06b0837 |
| stress_composition_008.yaml            | e07cb6d32a01722b511c6f3c25daae4a787a5fe72590ec10344ed61bdb3a7e22 |
| stress_composition_009.yaml            | 074350e334a4c04a42c23b2ac3317587a4a14a1b0d6508aec54f9757f9463488 |
| stress_composition_010.yaml            | 296e27b0d08ae3ebdbb3f71b70d06ef15e5c21f8ae6b773ca30896cf3adf8326 |
| stress_composition_011.yaml            | 5687faf5f8d282db2e6b4f4327a66e31b946bcfaf379e66117affd02edf1c144 |
| stress_composition_012.yaml            | 3aac5cb918dcfef687da44abf61576aa081af81b968cc15005c2e8379906837e |
| stress_composition_013.yaml            | 8e766733efc11d60093bcb5e6a9741a2522562d418d1943b2e46eb4497efc8ed |
| stress_composition_014.yaml            | 8ad983d66474c5ffc93793885dc75894c5bc3dbd6812565b99b261bed6f841db |
| stress_composition_015.yaml            | 37a93996cd96fc8093024cc45b37510d4d5223886c02986f3c85deca2828fd99 |
| stress_composition_016.yaml            | 578f445ba1f6555adb0402bff96c9bc23cedf7d95ab66707dba17949b87573d9 |
| stress_composition_017.yaml            | e7dfae6e1f685f9f4d3a1f695450eea0f0d72d5689f9168b795ffa20a68e0f0e |
| stress_composition_018.yaml            | 8d9a88c5b5a68b021d9b78ee12607d41ca3b53a4f333c274064c1bb6bae28478 |
| stress_composition_019.yaml            | 3c2d6b2b65566feb633eaae148fdf1e5de601ca36de61e1b65ed6ec7d5648bfb |
| stress_composition_020.yaml            | 71c7142c8bbc8850c74d42c0b09ce272efca6c85d1c1a05bb422e8e8b5767e9f |
| stress_dense_clutter_001.yaml          | 76e69e53b48877962ca144d2470dbe3097a8e1a088022e4ae337fedd17840a40 |
| stress_dense_clutter_002.yaml          | 57e4b4d0adee732d3a221657cf0a35bc09afe11a14d47a7bf37dcdb01f7f217d |
| stress_dense_clutter_003.yaml          | b04514e65363f8e47e63f6453e8250de74c53bfc0986424b74555c0149bb7077 |
| stress_dense_clutter_004.yaml          | ae8c23e3eab2c30bf7c322be88101ff8ed145ea2c44091b5d072f2eefc4fc941 |
| stress_dense_clutter_005.yaml          | 7b5f2e38b5ea970aa4aff245ebd720e11561b6d0c5bd25ece30c7dc2894fbcc1 |
| stress_dense_clutter_006.yaml          | fbc60a35e72448f7600ae47f1412173417fcb77df4fd6fd0922c71bd0a1fb3c5 |
| stress_dense_clutter_007.yaml          | ebd42e9a82a6f05fbb8912d5033d044d92a9cb8182d65e3d7ccf580b596b7bed |
| stress_dense_clutter_008.yaml          | 7f6355921c4c19103a844e0b25954495fa7d5d5ebd00151f8abd02a1e00fa6b2 |
| stress_dense_clutter_009.yaml          | 6560a296219e604f4b08bad276b113d5071a37170917cb29852c0ddc0dc30540 |
| stress_dense_clutter_010.yaml          | 8c31bb02fc71662a1c0f50f4f5d0fbeb12049df68d9cba2a5a0942bf33d82af2 |
| stress_dense_clutter_011.yaml          | 55d69c6f9bd4fcfc7d25bf20cfb03709d8be1e4d65e5fa0da233d4cbaa3fad01 |
| stress_dense_clutter_012.yaml          | a703fef96fa029fcf456489ae1e1c732feb149b789234ec13846cce6788ad322 |
| stress_dense_clutter_013.yaml          | 7dfe22f72b78ee9758e5a3c87516cc0891bde9bf33d1cc2670aa3a6f8cbfc96f |
| stress_dense_clutter_014.yaml          | 3cce3a0f5934b50f88fa7f3abb065f74dc35ad87e27bc7f5e7f12c3545da5eb7 |
| stress_dense_clutter_015.yaml          | 5bd475d025041f0f3d8c5f3f3a2b4e7a2d02b52aced5643ee9ead244ce7afc14 |
| stress_dense_clutter_016.yaml          | bd71935f8de7193c96de3e4efa82a21b570843f52412cee7070799ee72fa54c5 |
| stress_dense_clutter_017.yaml          | 4840c11cd4245f3b963d0197338a58a938062c6aba95638d0a2445a3f2246187 |
| stress_dense_clutter_018.yaml          | 9ea0de18ebea5df60a7584d5add6b1175edc21a67f18692ff106e5662e9ed9de |
| stress_dense_clutter_019.yaml          | 07e9fb07fe5470257d72d319853b9c815998b9e03d7f478d17ffe087d04f16db |
| stress_dense_clutter_020.yaml          | 86fecd8796c4491e790a35536455763277f474b5c55b5301e8be114806285235 |
| stress_extreme_aspect_scene_001.yaml   | 6e9b0a16ce00774a052959cfe8f6d672a01b3f07c04da483a4ca1a3a179b2129 |
| stress_extreme_aspect_scene_002.yaml   | 6d5e4f21927626ac1be41aa983fe674447f15587dfa3987ae92b87bd88dff9b8 |
| stress_instrument_heavy_001.yaml       | 580cb778041a592d5c95f07c422b7adafd9d5765c217086b5f9a2a9e3216e78d |
| stress_instrument_heavy_002.yaml       | bd6752491e6fc4a770ec8384160fb51447823d3ba8d22eed7075a0023ce65c5b |
| stress_instrument_heavy_003.yaml       | 5e9369b9bb2b3b8d60e9144e6302a4477d5b444616f9aa640b4dd7950de2a722 |
| stress_instrument_heavy_004.yaml       | 2a7d953384116f18e521b13e58b4529db8329d14c37fd05d0e66b8668f2dbbab |
| stress_instrument_heavy_005.yaml       | 850b409dfb13f9323c4a6db9930d4664562b052376eee4997029c62e004589b5 |
| stress_instrument_heavy_006.yaml       | 021a9c657b8c5d093280a529a2783f8bf445778241ef3d0d4d89760ed9590349 |
| stress_instrument_heavy_007.yaml       | 45009912b9239ce835064ba9b746c2a6b8b7b6c7829b6e3427227f2730520f03 |
| stress_instrument_heavy_008.yaml       | cb62ac447148cfb85da15dd05a48ae62e2b18384b4b5c3851bdbd1385dd0fd3b |
| stress_instrument_heavy_009.yaml       | b0c13381e1400959a196cb70bd725778213eaa381778fa2b1fcd9be999ac64e2 |
| stress_instrument_heavy_010.yaml       | dd2a2c6d77ceec452ff3bf8b9c0d1256b3ab6d921a76db808f1a92001777a791 |
| stress_instrument_heavy_011.yaml       | be4fa05c6908be52382aa972dccd2b6a64f6deb27a6797389db5cac818412403 |
| stress_instrument_heavy_012.yaml       | 98b2a8dc6b6fb4fc6b13938ab2f0f2911d6ca42b4aff35aa778d2b5951be4b5a |
| stress_instrument_heavy_013.yaml       | 727a09fb422e53e9d99702d0e072654f78ce274386a17d998cd8de7e13e91899 |
| stress_instrument_heavy_014.yaml       | a03466d5ea21c8fb6d529c02e295b3e3926b68ab65ccee5ac447f864cab2dd7f |
| stress_instrument_heavy_015.yaml       | d8466f0ac97a3dc5ab7a6eb85ab66dc256dd595d3447d888b950b55e36619f91 |
| stress_long_label_scene_001.yaml       | 7fe107895dcce5217e6bdb1a7b7aee2ddf9713e54850da5db6b25d97d1fbd190 |
| stress_long_label_scene_002.yaml       | e910a6e200cc39c59d93c518276e23abdb4f9d21351ea3fa83b8426fd03bc7b8 |
| stress_long_label_scene_003.yaml       | e770eb71816d9508b81de94d02d5893c232dbc2679a926add65ad21ca28a9283 |
| stress_long_label_scene_004.yaml       | 2ef08c1484a1413fb73569be44d3e39c43027ce6d5ba2beb2a1919b801958bd3 |
| stress_long_label_scene_005.yaml       | 13fad805e05735d6e83578586cc880e0f6bc57f62f2d9b84d496603cb66de995 |
| stress_many_bottles_scene_001.yaml     | 208d28db0801b3944e905392fb4a8fbbb60eaea746ebd97700264aaabce0ecf6 |
| stress_many_bottles_scene_002.yaml     | 1b580c965364971ae0a3206b47b688a0956d9bbeba50862c7461fba498b46304 |
| stress_many_small_tools_scene_001.yaml | 478d95ede91d20f4ae476c5836b2f2281f0d8327284c151aac24cb19a2b381ab |
| stress_many_small_tools_scene_002.yaml | 27a91f1123bc8e4272f0252245596da2f509082666511d9c4a654e2dd3aab3f1 |
| stress_many_small_tools_scene_003.yaml | e657707a0b9558dc8ce2dc0faa73152f49e8e5ccd94cf1a42ac52af46c00470a |
| stress_tall_glassware_scene_001.yaml   | 219125f57448bfae4031fb8b9c45604a80e546c4d98299e24077d73bff73caac |
| stress_tall_glassware_scene_002.yaml   | b639ec3e8b3a6eee3b5255bfc3209b10f429e9cf8077ce75131bd37e9dd7b309 |
| stress_tall_glassware_scene_003.yaml   | e76f418d7f72c7e1210a3081dbbe0a65ddbdc1aa2a1b79bffd0fdbdfe00b750e |
| stress_template_001.yaml               | b0fce0007b5e2045e31693556400827c5002efbe1ef421a1ed5970c6aca154a4 |
| stress_template_002.yaml               | ffe8c2b932691cfe8ba151a36e4ac75225772b8cd8f5a8f4921c94ffb853e372 |
| stress_template_003.yaml               | c360a3ab8617738ba4049ee12ec17d728978d196309801bfbffb691a5a3bf7a0 |
| stress_template_004.yaml               | 6355100de991f0fc562474706e0a14a4d8513b17600aa6b9881a2e525049f2f5 |
| stress_template_005.yaml               | a06e0f63fd76540e9138d7fbe677a401b3beebd3e7184d36d593a6fa3f241ae3 |
| stress_template_006.yaml               | 57733b7e734c82d5f42e24893b3163bcc1e5537d0142c0b5a566cf9020b40812 |
| stress_template_007.yaml               | d79ed72b34360f344b1325845ef8bb437c8074254106210ed453f4ed5e6d4abf |
| stress_template_008.yaml               | 1039cccbb93e26ae65d027561b9167a41872303ea9da06f1f0dcc3548ad4a928 |
| stress_template_009.yaml               | 47b5752d66ba7ea6939bf15451424ce749c8c579148835639916347b47e15d0a |
| stress_template_010.yaml               | a2ee9be970dde2b98a0df827446e4c6be334a73a216182410aeb0a7d192593b0 |
| stress_template_011.yaml               | 50857fd0193534749e33feafd6d74a066775bd910e6bcf6c922c3db2c610dba4 |
| stress_template_012.yaml               | 4ae22489fbbea3c952afe6d6aba33ed7d28375f31c50ff399aea0553ed0a4d77 |
| stress_template_013.yaml               | 12df8b7dcc3b7108420ab0f03ed3c9d725f9af740f60f805fabb1f63744017cd |
| stress_template_014.yaml               | 92d2f50c11d7d7c91cfbee4a0bbaf393a77800890fb1721facab39179b46da18 |
| stress_template_015.yaml               | 6b40dd0f88a7b3840fbe0911b7d9d33c988b2c6fdd13eea2dec9be608d39ae20 |
| stress_template_016.yaml               | fb32e90ce9a4534e021a4a6bf5b6caf1a071e9725c4505f8e7fd5e3b2d5b92fc |
| stress_template_017.yaml               | e11f3ad114f556e0c9f7d6b261a6c498847c11d2d5b04e56bf03b7dfa7e9c1dc |
| stress_template_018.yaml               | 4ce4638a3e07677fce4bd349b1698942351fcacb7574ce3c23caa3c8325d4ef2 |
| stress_template_019.yaml               | 58ffbda29f8f8518572fcebef8c8b70708fcfe085fbf1b55427b313c563ab6ba |
| stress_template_020.yaml               | 7845b668deb65b7f2c4dafd80246a808b8d8186e14b02deee4cd47fd37b74545 |
| stress_zoom_detail_001.yaml            | bb195bd46699493294d7dce4d3e153e62a0c7ece58b83887d6d870078cbf7a2a |
| stress_zoom_detail_002.yaml            | 6ceab13ce2da0be02211d83b3e73254364e7b8ea8bf13e551e13f67dadeaf2a6 |
| stress_zoom_detail_003.yaml            | 914e598c5bf0a9bfef3eb2d640ecc798aefa338a6e0774c53452b80f3239e3a6 |
| stress_zoom_detail_004.yaml            | adc0ab450cd10bebc1bee02438e6a19145ab8cc0ea324f99cc84b2ff022546a8 |
| stress_zoom_detail_005.yaml            | 495a1da92fba49df404b549c8f4d933ecbdb88f0840372c6e6f605a4b93397b3 |
| stress_zoom_detail_006.yaml            | c48b1fce94ca2b51da8e4b85c2a8575c2c5a06898bcfdf4f135ac862cc957dbe |
| stress_zoom_detail_007.yaml            | f740cf5aa9edd3a9d0ca2d191f6a16faf9adc37358d5269cee38a1a7f5ee4a1c |
| stress_zoom_detail_008.yaml            | 90ea2d92d7629282005fdcdbea9c61b79db5fa99d357426d74290e6b0c350ee7 |
| stress_zoom_detail_009.yaml            | 2361a50035e88e98da3379374bc674c282501e85f1ac74234e840b022ea9b65a |
| stress_zoom_detail_010.yaml            | 9ef260460f708c6220a573d04badbbe8550c7ddfd4c52f398a87ce38fb425585 |

## Manifest Paths

- **Stress scene YAMLs**: `experiments/css_native_layout/stress_scenes/generated/`
- **Rendered HTML outputs**: `experiments/css_native_layout/stress_results/batch*_rendered/`
- **Precheck diagnostics**: `experiments/css_native_layout/stress_results/batch*_precheck/`
- **Canonical scorecards**: `experiments/css_native_layout/stress_results/batch*_scorecard/`

## Future Versions

Corpus v2 (or later) will be declared when:

1. **New asset categories** are introduced that change the object pool (e.g., new bottles, glassware, or instruments not in the v1 plan).
2. **New stress scene classes** are added to the `SCENE_CLASS_PLAN` that expand the design space.
3. **Schema or generator logic changes** that alter how scenes are built or validated.
4. **Region placement caps** are modified to reflect new layout constraints or visual limits.

Each new corpus version must include:

- Updated frozen date
- New commit hash and file hash
- Full regenerated scene list with sha256 hashes
- Updated random seed value
- Updated regeneration command

This rule ensures that all future batch metrics remain comparable within a corpus version while allowing controlled, tracked evolution.

## Notes

- The `--seed 42` value was chosen for reproducibility and stability. Changing the seed value will produce a different set of 100 scenes.
- Generator commits before 4d03b4ba are not guaranteed to reproduce Corpus v1 with `--seed 42` if they use different RNG logic.
- All 100 YAMLs were generated with the placement cap guardrail active (region-aware object binning).
- No CSS changes have been applied between stress scene generation and precheck/rendering for any batch that uses Corpus v1.
