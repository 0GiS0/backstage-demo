import React from 'react';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderLayout, LayoutTemplate } from '@backstage/plugin-scaffolder-react';
import { Grid } from '@material-ui/core';

const TwoColumn: LayoutTemplate = ({ properties, description, title }) => {
    const mid = Math.ceil(properties.length / 2);

    return (
        <>
            <h1>
                <img src="https://www.returngis.net/wp-content/uploads/2018/12/returngis-logo.png" alt="Logo" style={{ height: '2em', marginRight: '0.5em' }} />
                {title}
            </h1>
            <h2>In two column layout!!</h2>
            <Grid container justifyContent="flex-end">
                {properties.slice(0, mid).map(prop => (
                    <Grid item xs={6} key={prop.content.key}>
                        {prop.content}
                    </Grid>
                ))}
                {properties.slice(mid).map(prop => (
                    <Grid item xs={6} key={prop.content.key}>
                        {prop.content}
                    </Grid>
                ))}
            </Grid>
            {description}
        </>
    );
};

export const TwoColumnLayout = scaffolderPlugin.provide(
    createScaffolderLayout({
        name: 'TwoColumn',
        component: TwoColumn,
    }),
);