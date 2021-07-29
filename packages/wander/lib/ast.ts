/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WanderValue } from "."

export type Script = { elements: Array<Element> }
export type Element = LetStatement | Expression
export type LetStatement = { type: 'LetStatement', name: Identifier, value: Expression }
export type Identifier = { identifier: string }
export type Expression = { value: WanderValue }
