# Visualization Toolbox
Visualization Toolbox is an add-on for Splunk Enterprise powered by the Apache ECharts library.



## Releases:
A tar file for installation on you instance can be found here:
* Github: https://github.com/hman-78/visualization_toolbox/releases
* Splunkbase: https://splunkbase.splunk.com/app/6675


## Usage
Sample Data can be found in the Lookups folder, add those data in Splunk and follow visualizations. Examples of visualizations can be found in the "Docs/Tutorials" tab in the app.

#### Custom
    * SPL
        ```
        | inputlookup spc.csv
        | table no,UCL,LCL,Center,Data,"Out of Limits","Run of 7"
        ```
    * Data Type -> Custom
    * Option -> copy echarts options,e.g.:
        ```
         {  
            xAxis: {
                type: 'category',
                boundaryGap: false
            }, 
            yAxis: {
                type: 'value',
                scale: true,
                axisLine: { show: false }
            },
            series: [{ 
                    type: 'line'
                },
                { 
                    type: 'bar'
                },
                { 
                    type: 'scatter'
                },
                { 
                    type: 'bar' 
                },
                { 
                    type: 'scatter' 
                },
                {
                    type: 'scatter' 
                }
            ]
        }   
        ```
    * xAxis Data Index Binding -> Data index corresponding to the x-axis ,e.g.: 1
    * Series Data Index Binding -> Data index corresponding to the series , e.g.:1,2,3,4,5

## Install and build app by yourself
* Clone repository
* run:
```
cd appserver/static/visualizations/hman

npm ci

cp -a node_modules_patch/* node_modules/

npm run build

rm -rf node_modules
rm -rf node_modules_patch  
```

### Workflow for contribute to new app release
* Create pull request to merge your new code to `test` branch and request review
* Test the build app on a splunk instance
* run the manual Appinspect tests
* Create pull request to `main` branch and request review


## Version support
8.2.9 and all newer versions


## Support
This App is developer-supported 
