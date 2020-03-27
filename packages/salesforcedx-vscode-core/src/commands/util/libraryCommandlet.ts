/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/out/src/types';
import { ToolingRetrieveResult } from '@salesforce/source-deploy-retrieve/lib/tooling/retrieve';
import { ProgressLocation, window } from 'vscode';
import { channelService } from '../../channels';
import { nls } from '../../messages';
import { notificationService } from '../../notifications';
import { TelemetryData, telemetryService } from '../../telemetry';
import { OrgAuthInfo } from '../../util';
import { CommandletExecutor } from './sfdxCommandlet';

export abstract class LibraryCommandletExecutor<T>
  implements CommandletExecutor<T> {
  protected showChannelOutput = true;
  protected orgConnection: Connection | undefined;
  protected executionName: string = '';
  protected startTime: [number, number] | undefined;
  protected telemetryName: string | undefined;

  public execute(response: ContinueResponse<T>): void {}

  public async build(
    execName: string,
    telemetryLogName: string
  ): Promise<void> {
    this.executionName = execName;
    this.telemetryName = telemetryLogName;
    // initialize connection
    const usernameOrAlias = await OrgAuthInfo.getDefaultUsernameOrAlias(true);
    if (!usernameOrAlias) {
      throw new Error(nls.localize('error_no_default_username'));
    }
    this.orgConnection = await OrgAuthInfo.getConnection(usernameOrAlias);
  }

  public retrieveWrapper(
    fn: (...args: any[]) => Promise<ToolingRetrieveResult>
  ) {
    const commandName = this.executionName;

    return async function(...args: any[]): Promise<ToolingRetrieveResult> {
      channelService.showCommandWithTimestamp(`Starting ${commandName}`);

      const result = await window.withProgress(
        {
          title: commandName,
          location: ProgressLocation.Notification
        },
        async () => {
          // @ts-ignore
          return (await fn.call(this, ...args)) as ToolingRetrieveResult;
        }
      );

      channelService.appendLine('Library result =>' + JSON.stringify(result));
      channelService.showCommandWithTimestamp(`Finished ${commandName}`);
      await notificationService.showSuccessfulExecution(commandName);
      return result;
    };
  }

  public logMetric() {
    telemetryService.sendCommandEvent(this.telemetryName, this.startTime);
  }

  public setStartTime() {
    this.startTime = process.hrtime();
  }

  protected getTelemetryData(
    success: boolean,
    response: ContinueResponse<T>,
    output: string
  ): TelemetryData | undefined {
    return;
  }
}
