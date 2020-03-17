/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommandletExecutor } from './sfdxCommandlet';
import { telemetryService, TelemetryData } from '../../telemetry';
import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/out/src/types';
import { nls } from '../../messages';
import { OrgAuthInfo } from '../../util';
import { Connection } from '@salesforce/core';

export abstract class LibraryCommandletExecutor<T>
  implements CommandletExecutor<T> {
  protected showChannelOutput = true;
  protected orgConnection: Connection | undefined;

  public execute(response: ContinueResponse<T>): void {}

  public async build(): Promise<void> {
    // initialize connection
    const usernameOrAlias = await OrgAuthInfo.getDefaultUsernameOrAlias(true);
    if (!usernameOrAlias) {
      throw new Error(nls.localize('error_no_default_username'));
    }
    this.orgConnection = await OrgAuthInfo.getConnection(usernameOrAlias);
  }

  public logMetric(
    logName: string | undefined,
    executionTime: [number, number],
    additionalData?: any
  ) {
    telemetryService.sendCommandEvent(logName, executionTime, additionalData);
  }

  protected getTelemetryData(
    success: boolean,
    response: ContinueResponse<T>,
    output: string
  ): TelemetryData | undefined {
    return;
  }
}
