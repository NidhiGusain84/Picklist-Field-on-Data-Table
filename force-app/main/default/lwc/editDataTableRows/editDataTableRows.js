import { LightningElement, api, wire } from 'lwc';
import getContactsBasedOnAccount from '@salesforce/apex/ContactController.getContactsBasedOnAccount';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CONTACT_OBJECT from '@salesforce/schema/Contact';
import LEAD_SOURCE_FIELD from '@salesforce/schema/Contact.LeadSource';

const COLUMNS = [
    { label: 'First Name', fieldName: 'FirstName', editable: true },
    { label: 'Last Name', fieldName: 'LastName', editable: true },
    { label: 'Title', fieldName: 'Title', editable: true },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
    { label: 'Email', fieldName: 'Email', type: 'email' },
    {
        label: 'Lead Source', fieldName: 'LeadSource', type: 'customPicklist', editable: true, typeAttributes: {
            options: { fieldName: 'picklistOptions' },
            value: { fieldName: 'LeadSource' },
            context: { fieldName: 'Id' }
        }
    }
];

export default class EditDataTableRows extends LightningElement {
    @api recordId;
    contactData = [];
    columns = COLUMNS;
    draftValues = [];
    contactRefreshProp;
    leadSourceOptions = [];

    @wire(getContactsBasedOnAccount, {
        accountId: "$recordId",
        pickList: "$leadSourceOptions"
    })
    getContactsOutput(result) {
        this.contactRefreshProp = result;
        if (result.data) {
            this.contactData = result.data.map(currentItem => {
                let picklistOptions = this.leadSourceOptions;
                return {
                    ...currentItem,
                    picklistOptions: picklistOptions
                };
            });

        } else if (result.error) {
            console.log("Error while loading records.");
        }
    }

    @wire(getObjectInfo, {
        objectApiName: CONTACT_OBJECT
    }) objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: "$objectInfo.data.defaultRecordTypeId",
        fieldApiName: LEAD_SOURCE_FIELD
    }) wiredPicklist({ data, error }) {
        if (data) {
            this.leadSourceOptions = data.values;
        } else if (error) {
            console.log("Error while loading data", error);
        }
    }

    async saveHandler(event) {
        let records = event.detail.draftValues;
        let updatedRecordsArray = records.map(currentItem => {
            let fieldInput = { ...currentItem };
            return {
                fields: fieldInput
            }
        });

        this.draftValues = [];
        let updateRecordsArrayPromise = updatedRecordsArray.map((currentItem) =>
            updateRecord(currentItem)
        );

        await Promise.all(updateRecordsArrayPromise);
        const toastEvent = new ShowToastEvent({
            title: 'Success',
            variant: 'success',
            message: 'Records updated successfully.',
        });
        this.dispatchEvent(toastEvent);
        await refreshApex(this.contactRefreshProp);
    }

}