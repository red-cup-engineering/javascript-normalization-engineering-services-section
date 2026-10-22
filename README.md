# Javascript normalization services section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Groups services that normalize JavaScript packages and code toward standard forms.

## Services

- `services/review-jsnode-package-service` — reviews one package's manifest and file
  list, returning the normalized manifest and any deviations from standard form.

## Related published capabilities

Manifest normalization is composed from `@red-cup-engineering/npm-package-manifest-normalization-service`,
which chains identity application, version normalization, pnpm declaration removal,
and lifecycle-command normalization.
