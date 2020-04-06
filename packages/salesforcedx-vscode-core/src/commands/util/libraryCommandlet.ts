/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/out/src/types';
import {
  SourceClient,
  ToolingDeployResult
} from '@salesforce/source-deploy-retrieve';
import { ApiResult } from '@salesforce/source-deploy-retrieve/lib/client/client';
import { ProgressLocation, window } from 'vscode';
import { channelService } from '../../channels';
import { ToolingDeployParser } from '../../deploys';
import { nls } from '../../messages';
import { notificationService } from '../../notifications';
import { TelemetryData, telemetryService } from '../../telemetry';
import { OrgAuthInfo } from '../../util';
import { CommandletExecutor } from './sfdxCommandlet';

export abstract class LibraryCommandletExecutor<T>
  implements CommandletExecutor<T> {
  protected showChannelOutput = true;
  protected sourceClient: SourceClient | undefined;
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
    const conn = await OrgAuthInfo.getConnection(usernameOrAlias);
    this.sourceClient = new SourceClient(conn, '48.0');
  }

  public retrieveWrapper(fn: (...args: any[]) => Promise<ApiResult>) {
    const commandName = this.executionName;

    return async function(...args: any[]): Promise<ApiResult> {
      channelService.showCommandWithTimestamp(`Starting ${commandName}`);

      const result = await window.withProgress(
        {
          title: commandName,
          location: ProgressLocation.Notification
        },
        async () => {
          // @ts-ignore
          return (await fn.call(this, ...args)) as ApiResult;
        }
      );

      channelService.appendLine('Library result =>' + JSON.stringify(result));
      channelService.showCommandWithTimestamp(`Finished ${commandName}`);
      await notificationService.showSuccessfulExecution(commandName);
      return result;
    };
  }

  public deployWrapper(fn: (...args: any[]) => Promise<ToolingDeployResult>) {
    const commandName = this.executionName;

    return async function(...args: any[]): Promise<ToolingDeployResult> {
      channelService.showCommandWithTimestamp(`Starting ${commandName}`);

      const result = await window.withProgress(
        {
          title: commandName,
          location: ProgressLocation.Notification
        },
        async () => {
          // @ts-ignore
          return (await fn.call(this, ...args)) as ToolingDeployResult;
        }
      );

      const parser = new ToolingDeployParser(result);
      const outputResult = await parser.outputResult();
      channelService.appendLine(outputResult);
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
