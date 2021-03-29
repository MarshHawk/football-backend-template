#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { MlsFootballAppStack } from '../lib/mls-football-app-stack';

const app = new cdk.App();
new MlsFootballAppStack(app, 'MlsFootballAppStack');
